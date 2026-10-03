-- Community data is independent of the immutable paper snapshot.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table private.reviewers (
  user_id uuid primary key references auth.users(id),
  created_at timestamptz not null default now()
);
create function public.is_reviewer() returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from private.reviewers where user_id = auth.uid());
$$;
create function private.can_review() returns boolean language sql stable security definer
set search_path = '' as $$
  select public.is_reviewer() and coalesce(auth.jwt()->>'aal','') = 'aal2';
$$;

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  kind text not null check(kind in ('benchmark','method','result')),
  status text not null default 'draft' check(status in ('draft','submitted','in_review','changes_requested','published','rejected','withdrawn')),
  payload jsonb not null default '{}'::jsonb,
  revision integer not null default 1,
  lock_version integer not null default 1,
  reviewer_id uuid references auth.users(id),
  target_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz,
  check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=131072)
);
create table public.submission_revisions (
  submission_id uuid not null references public.submissions(id),
  revision integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  primary key(submission_id, revision)
);
create table public.review_events (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions(id),
  revision integer not null,
  actor_id uuid not null references auth.users(id),
  action text not null,
  message text not null default '',
  created_at timestamptz not null default now()
);
-- Internal notes are physically separated; never returned in author queries.
create table public.review_notes (
  id bigint generated always as identity primary key,
  submission_id uuid not null references public.submissions(id),
  actor_id uuid not null references auth.users(id),
  message text not null,
  created_at timestamptz not null default now()
);
create table public.publications (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null,
  submission_id uuid not null unique references public.submissions(id),
  kind text not null check(kind in ('benchmark','method','result')),
  title text not null,
  payload jsonb not null,
  benchmark_id uuid references public.publications(id),
  method_id uuid references public.publications(id),
  supersedes uuid references public.publications(id),
  is_current boolean not null default true,
  archived boolean not null default false,
  published_at timestamptz not null default now(),
  check(kind='result' or (benchmark_id is null and method_id is null))
);
create unique index publications_current on public.publications(entity_id) where is_current;
alter table public.submissions add foreign key(target_id) references public.publications(id);
create index submissions_owner on public.submissions(owner_id,updated_at desc);
create index submissions_queue on public.submissions(status,submitted_at);
create index publications_kind on public.publications(kind,published_at desc,id);
create index events_submission on public.review_events(submission_id,id);
create table public.attachments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id),
  revision integer not null,
  owner_id uuid not null references auth.users(id),
  filename text not null,
  object_path text not null unique,
  mime_type text not null,
  byte_size bigint not null check(byte_size > 0 and byte_size <= 10485760),
  sha256 text,
  status text not null default 'pending' check(status in ('pending','ready','failed')),
  created_at timestamptz not null default now()
);

alter table public.submissions enable row level security;
alter table public.submission_revisions enable row level security;
alter table public.review_events enable row level security;
alter table public.review_notes enable row level security;
alter table public.publications enable row level security;
alter table public.attachments enable row level security;
revoke all on public.submissions, public.submission_revisions, public.review_events,
  public.review_notes, public.publications, public.attachments from anon, authenticated;
grant select on public.publications to anon, authenticated;
grant select on public.submissions, public.submission_revisions, public.review_events,
  public.review_notes, public.attachments to authenticated;
create policy publication_read on public.publications for select using(not archived);
create policy submission_read on public.submissions for select to authenticated
  using(owner_id=auth.uid() or private.can_review());
create policy revision_read on public.submission_revisions for select to authenticated
  using(exists(select 1 from public.submissions s where s.id=submission_id));
create policy event_read on public.review_events for select to authenticated
  using(exists(select 1 from public.submissions s where s.id=submission_id));
create policy note_read on public.review_notes for select to authenticated using(private.can_review());
create policy attachment_read on public.attachments for select to authenticated
  using(owner_id=auth.uid() or private.can_review());

create function private.require_user() returns uuid language plpgsql stable security definer
set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  return auth.uid();
end $$;
create function private.check_payload(k text,p jsonb) returns void language plpgsql
set search_path='' as $$
declare f text; n numeric; lo numeric; hi numeric; b public.publications;
begin
  if jsonb_typeof(p)<>'object' or octet_length(p::text)>131072 then raise exception 'Invalid payload'; end if;
  if coalesce(p->>'schema_version','')<>'1' then raise exception 'Unsupported schema version'; end if;
  if exists(select 1 from jsonb_object_keys(p) a(key) where key not in
    ('schema_version','title','summary','contributor','institution','source_url','license','version','category',
    'metric','unit','direction','minimum','maximum','split','evaluator','protocol','family','configuration',
    'benchmark_id','method_id','model','model_version','run_date','score','baseline','baseline_matched',
    'sample_count','repetitions','aggregation','cost_usd','cost_notes','evidence_url','limitations','attestation'))
    then raise exception 'Unexpected fields'; end if;
  foreach f in array array['title','summary','contributor','source_url'] loop
    if length(btrim(coalesce(p->>f,'')))<2 then raise exception 'Required field: %',f; end if;
  end loop;
  if length(p->>'title')>160 or length(p->>'summary')>6000 then raise exception 'Text too long'; end if;
  foreach f in array array['source_url','evidence_url'] loop
    if coalesce(p->>f,'')<>'' and (p->>f !~ '^https?://[^[:space:]]+$' or length(p->>f)>2000)
      then raise exception 'Invalid URL: %',f; end if;
  end loop;
  if coalesce(p->>'attestation','false')<>'true' then raise exception 'Publication permission required'; end if;
  if k='benchmark' then
    foreach f in array array['license','version','category','metric','unit','split','evaluator','protocol'] loop
      if length(btrim(coalesce(p->>f,'')))<1 then raise exception 'Required field: %',f; end if;
    end loop;
    if coalesce(p->>'direction','') not in ('higher','lower') then raise exception 'Invalid metric direction'; end if;
    foreach f in array array['minimum','maximum'] loop
      if coalesce(p->>f,'')<>'' and p->>f !~ '^-?[0-9]+([.][0-9]+)?$' then raise exception 'Invalid metric bound'; end if;
    end loop;
    if nullif(p->>'minimum','')::numeric>=nullif(p->>'maximum','')::numeric then raise exception 'Invalid bounds'; end if;
  elsif k='method' then
    if coalesce(p->>'family','') not in ('ICL','SkillOpt','SFT','RL','TTT','Other') then raise exception 'Invalid family'; end if;
    if length(btrim(coalesce(p->>'version','')))=0 or length(btrim(coalesce(p->>'configuration','')))=0 then raise exception 'Version and configuration required'; end if;
  elsif k='result' then
    foreach f in array array['model','model_version','run_date','configuration','aggregation','evidence_url'] loop
      if length(btrim(coalesce(p->>f,'')))=0 then raise exception 'Required field: %',f; end if;
    end loop;
    if p->>'run_date' !~ '^\d{4}-\d{2}-\d{2}$' or (p->>'run_date')::date > current_date then raise exception 'Invalid run date'; end if;
    foreach f in array array['score','baseline','cost_usd','sample_count','repetitions'] loop
      if coalesce(p->>f,'')<>'' and p->>f !~ '^-?[0-9]+([.][0-9]+)?$' then raise exception 'Invalid number: %',f; end if;
    end loop;
    if coalesce(p->>'score','')='' then raise exception 'Score required'; end if;
    if coalesce(p->>'sample_count','') !~ '^[1-9][0-9]*$' or coalesce(p->>'repetitions','') !~ '^[1-9][0-9]*$' then raise exception 'Positive integer counts required'; end if;
    if nullif(p->>'cost_usd','')::numeric < 0 then raise exception 'Cost cannot be negative'; end if;
    if coalesce(p->>'cost_usd','')<>'' and coalesce(p->>'cost_notes','')='' then raise exception 'Cost accounting required'; end if;
    if coalesce(p->>'baseline','')<>'' and coalesce(p->>'baseline_matched','false')<>'true' then raise exception 'Confirm matched baseline'; end if;
    select * into b from public.publications where id=(p->>'benchmark_id')::uuid and kind='benchmark' and not archived;
    if not found then raise exception 'Approved benchmark version required'; end if;
    if not exists(select 1 from public.publications where id=(p->>'method_id')::uuid and kind='method' and not archived) then raise exception 'Approved method version required'; end if;
    lo:=nullif(b.payload->>'minimum','')::numeric; hi:=nullif(b.payload->>'maximum','')::numeric;
    foreach f in array array['score','baseline'] loop
      n:=nullif(p->>f,'')::numeric;
      if n<lo or n>hi then raise exception 'Value outside benchmark bounds: %',f; end if;
    end loop;
  else raise exception 'Invalid contribution type'; end if;
end $$;

create function public.save_submission(p_id uuid,p_kind text,p_payload jsonb,p_lock integer default 0,p_target uuid default null)
returns public.submissions language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); s public.submissions;
begin
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if p_kind not in ('benchmark','method','result') or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>131072 then raise exception 'Invalid draft'; end if;
  select * into s from public.submissions where id=p_id for update;
  if found then
    if s.owner_id<>u then raise exception 'Not your submission'; end if;
    -- Idempotent successful save, without hiding divergent concurrent edits.
    if s.payload=p_payload and s.kind=p_kind and s.status='draft' then return s; end if;
    if s.status<>'draft' or s.lock_version<>p_lock or s.kind<>p_kind then raise exception 'Draft changed. Reload before saving'; end if;
    update public.submissions set payload=p_payload,lock_version=lock_version+1,updated_at=now() where id=p_id returning * into s;
  else
    if p_lock<>0 then raise exception 'Draft no longer exists'; end if;
    if (select count(*) from public.submissions where owner_id=u and status in ('draft','submitted','in_review','changes_requested'))>=20 then raise exception 'Too many open drafts'; end if;
    if p_target is not null and not exists(select 1 from public.publications p join public.submissions t on t.id=p.submission_id where p.id=p_target and p.is_current and not p.archived and p.kind=p_kind and t.owner_id=u) then raise exception 'Cannot update this publication'; end if;
    insert into public.submissions(id,owner_id,kind,payload,target_id) values(p_id,u,p_kind,p_payload,p_target) returning * into s;
  end if;
  return s;
end $$;

create function public.submit_revision(p_id uuid,p_lock integer) returns public.submissions
language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); s public.submissions;
begin
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  select * into s from public.submissions where id=p_id for update;
  if not found or s.owner_id<>u then raise exception 'Not your submission'; end if;
  if s.status in ('submitted','in_review') and s.lock_version=p_lock+1 then return s; end if;
  if s.status<>'draft' or s.lock_version<>p_lock then raise exception 'Draft changed. Reload'; end if;
  if (select count(*) from public.review_events e join public.submissions x on x.id=e.submission_id where x.owner_id=u and e.action='submitted' and e.created_at>now()-interval '24 hours')>=5 then raise exception 'Daily submission limit reached'; end if;
  if (select count(*) from public.submissions where owner_id=u and status in ('submitted','in_review'))>=10 then raise exception 'Pending submission limit reached'; end if;
  perform private.check_payload(s.kind,s.payload);
  if exists(select 1 from public.attachments where submission_id=p_id and revision=s.revision and status<>'ready') then raise exception 'Finish or remove pending attachments'; end if;
  insert into public.submission_revisions(submission_id,revision,payload) values(p_id,s.revision,s.payload);
  update public.submissions set status='submitted',submitted_at=now(),updated_at=now(),lock_version=lock_version+1 where id=p_id returning * into s;
  insert into public.review_events(submission_id,revision,actor_id,action) values(p_id,s.revision,u,'submitted');
  return s;
end $$;

create function public.revise_submission(p_id uuid) returns public.submissions language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); s public.submissions;
begin
 select * into s from public.submissions where id=p_id for update;
 if not found or s.owner_id<>u then raise exception 'Not your submission'; end if;
 if s.status='draft' then return s; end if;
 if s.status not in ('changes_requested','withdrawn') then raise exception 'Cannot revise in this state'; end if;
 update public.submissions set status='draft',revision=revision+1,lock_version=lock_version+1,reviewer_id=null,updated_at=now() where id=p_id returning * into s;
 insert into public.review_events(submission_id,revision,actor_id,action,message) values(p_id,s.revision,u,'revised','Previous evidence is retained in history; attach files for this revision if needed.');
 return s;
end $$;
create function public.withdraw_submission(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); s public.submissions;
begin
 select * into s from public.submissions where id=p_id for update;
 if not found or s.owner_id<>u then raise exception 'Not your submission'; end if;
 if s.status='withdrawn' then return; end if;
 if s.status not in ('submitted','in_review') then raise exception 'Cannot withdraw'; end if;
 update public.submissions set status='withdrawn',updated_at=now(),lock_version=lock_version+1 where id=p_id;
 insert into public.review_events(submission_id,revision,actor_id,action) values(p_id,s.revision,u,'withdrawn');
end $$;
create function public.claim_review(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare s public.submissions;
begin
 if not private.can_review() then raise exception 'Reviewer with MFA required'; end if;
 select * into s from public.submissions where id=p_id for update;
 if not found or s.owner_id=auth.uid() then raise exception 'Cannot review own submission'; end if;
 if s.status='in_review' and s.reviewer_id=auth.uid() then return; end if;
 if s.status<>'submitted' then raise exception 'Already claimed or not submitted'; end if;
 update public.submissions set status='in_review',reviewer_id=auth.uid(),updated_at=now(),lock_version=lock_version+1 where id=p_id;
 insert into public.review_events(submission_id,revision,actor_id,action) values(p_id,s.revision,auth.uid(),'claimed');
end $$;
create function public.decide_submission(p_id uuid,p_lock integer,p_decision text,p_message text,p_internal text default '')
returns uuid language plpgsql security definer set search_path='' as $$
declare s public.submissions; previous public.publications; pub_id uuid; new_status text;
begin
 if not private.can_review() then raise exception 'Reviewer with MFA required'; end if;
 select * into s from public.submissions where id=p_id for update;
 if not found or s.owner_id=auth.uid() then raise exception 'Cannot review own submission'; end if;
 if s.status='published' and p_decision='approve' and s.reviewer_id=auth.uid() then
   select id into pub_id from public.publications where submission_id=p_id; return pub_id;
 end if;
 if s.status<>'in_review' or s.reviewer_id<>auth.uid() or s.lock_version<>p_lock then raise exception 'Review changed. Reload'; end if;
 if p_decision not in ('approve','request_changes','reject') or length(btrim(p_message))<3 or length(p_message)>4000 or length(p_internal)>4000 then raise exception 'Decision and reason required'; end if;
 new_status:=case p_decision when 'approve' then 'published' when 'reject' then 'rejected' else 'changes_requested' end;
 if p_decision='approve' then
   perform private.check_payload(s.kind,s.payload);
   if s.target_id is not null then
     select * into previous from public.publications where id=s.target_id for update;
     if not previous.is_current or previous.archived then raise exception 'Publication changed. Create an update of the current version'; end if;
     update public.publications set is_current=false where id=s.target_id;
   end if;
   pub_id:=gen_random_uuid();
   insert into public.publications(id,entity_id,submission_id,kind,title,payload,benchmark_id,method_id,supersedes)
   values(pub_id,coalesce(previous.entity_id,pub_id),s.id,s.kind,s.payload->>'title',s.payload,
     case when s.kind='result' then (s.payload->>'benchmark_id')::uuid end,
     case when s.kind='result' then (s.payload->>'method_id')::uuid end,s.target_id);
 end if;
 update public.submissions set status=new_status,updated_at=now(),lock_version=lock_version+1 where id=p_id;
 insert into public.review_events(submission_id,revision,actor_id,action,message) values(p_id,s.revision,auth.uid(),p_decision,p_message);
 if length(btrim(p_internal))>0 then insert into public.review_notes(submission_id,actor_id,message) values(p_id,auth.uid(),p_internal); end if;
 return pub_id;
end $$;
create function public.archive_publication(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare p public.publications;
begin
 if not private.can_review() or length(btrim(p_reason))<3 then raise exception 'Reviewer with MFA and reason required'; end if;
 select * into p from public.publications where id=p_id for update;
 if not found then raise exception 'Publication not found'; end if;
 -- Dependent results cannot remain public after their protocol or method is removed.
 update public.publications set archived=true where entity_id=p.entity_id;
 update public.publications set archived=true where benchmark_id in (select id from public.publications where entity_id=p.entity_id) or method_id in (select id from public.publications where entity_id=p.entity_id);
 insert into public.review_events(submission_id,revision,actor_id,action,message)
 select p.submission_id,s.revision,auth.uid(),'archived',p_reason from public.submissions s where s.id=p.submission_id;
end $$;

-- Private bucket: every file is evidence-only in v1, never automatically published.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('submission-evidence','submission-evidence',false,10485760,array['application/pdf','application/json','text/csv','image/png','image/jpeg'])
on conflict(id) do nothing;
create policy evidence_read on storage.objects for select to authenticated using(
 bucket_id='submission-evidence' and exists(select 1 from public.attachments a where a.object_path=name and (a.owner_id=auth.uid() or private.can_review()))
);
create policy evidence_insert on storage.objects for insert to authenticated with check(
 bucket_id='submission-evidence' and exists(select 1 from public.attachments a join public.submissions s on s.id=a.submission_id
 where a.object_path=name and a.owner_id=auth.uid() and a.status='pending' and s.status='draft' and s.revision=a.revision)
);
-- No UPDATE/DELETE Storage policy: frozen evidence cannot be overwritten.
create function public.prepare_attachment(p_submission uuid,p_filename text,p_size bigint,p_mime text)
returns public.attachments language plpgsql security definer set search_path='' as $$
declare s public.submissions; a public.attachments; u uuid:=private.require_user(); aid uuid:=gen_random_uuid();
begin
 select * into s from public.submissions where id=p_submission for update;
 if not found or s.owner_id<>u or s.status<>'draft' then raise exception 'Editable draft required'; end if;
 if p_size<=0 or p_size>10485760 or length(p_filename)>160 or p_filename ~ '[/\\]' or p_mime not in ('application/pdf','application/json','text/csv','image/png','image/jpeg') then raise exception 'Unsupported attachment'; end if;
 if (select count(*) from public.attachments where submission_id=s.id and revision=s.revision)>=5 or
 (select coalesce(sum(byte_size),0) from public.attachments where submission_id=s.id and revision=s.revision)+p_size>26214400 then raise exception 'Attachment quota reached'; end if;
 insert into public.attachments(id,submission_id,revision,owner_id,filename,object_path,mime_type,byte_size)
 values(aid,s.id,s.revision,u,p_filename,u::text||'/'||s.id::text||'/'||aid::text,p_mime,p_size) returning * into a;
 return a;
end $$;
create function public.remove_pending_attachment(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare a public.attachments; s public.submissions;
begin
 select * into a from public.attachments where id=p_id;
 select * into s from public.submissions where id=a.submission_id for update;
 if a.owner_id<>private.require_user() or s.status<>'draft' or s.revision<>a.revision then raise exception 'Editable draft required'; end if;
 delete from public.attachments where id=p_id;
 -- Orphan object cleanup is a separate server task, never a client delete grant.
end $$;

-- Explicit function grants: Postgres defaults EXECUTE to PUBLIC.
revoke all on all functions in schema private from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.can_review() to authenticated;
revoke all on function public.is_reviewer(),public.save_submission(uuid,text,jsonb,integer,uuid),
 public.submit_revision(uuid,integer),public.revise_submission(uuid),public.withdraw_submission(uuid),
 public.claim_review(uuid),public.decide_submission(uuid,integer,text,text,text),public.archive_publication(uuid,text),
 public.prepare_attachment(uuid,text,bigint,text),public.remove_pending_attachment(uuid) from public,anon;
grant execute on function public.is_reviewer(),public.save_submission(uuid,text,jsonb,integer,uuid),
 public.submit_revision(uuid,integer),public.revise_submission(uuid),public.withdraw_submission(uuid),
 public.claim_review(uuid),public.decide_submission(uuid,integer,text,text,text),public.archive_publication(uuid,text),
 public.prepare_attachment(uuid,text,bigint,text),public.remove_pending_attachment(uuid) to authenticated;
