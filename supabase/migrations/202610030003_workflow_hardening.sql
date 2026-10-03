-- Keep reservations after attachment removal, so retries cannot bypass upload limits.
-- Each reservation is charged the bucket maximum (10 MB), regardless of claimed size.
create table private.upload_reservations (
  attachment_id uuid primary key,
  owner_id uuid not null references auth.users(id),
  object_path text not null unique,
  created_at timestamptz not null default now()
);
revoke all on private.upload_reservations from public,anon,authenticated;
create index upload_reservations_owner_time on private.upload_reservations(owner_id,created_at);
alter function public.prepare_attachment(uuid,text,bigint,text) rename to prepare_attachment_unmetered;
revoke all on function public.prepare_attachment_unmetered(uuid,text,bigint,text) from public,anon,authenticated;
create function public.prepare_attachment(p_submission uuid,p_filename text,p_size bigint,p_mime text)
returns public.attachments language plpgsql security definer set search_path='' as $$
declare u uuid:=private.require_user(); a public.attachments;
begin
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 if (select count(*) from private.upload_reservations where owner_id=u and created_at>now()-interval '24 hours')>=25
 then raise exception 'Daily upload limit reached (25 reservations / 250 MB maximum)'; end if;
 select * into a from public.prepare_attachment_unmetered(p_submission,p_filename,p_size,p_mime);
 insert into private.upload_reservations(attachment_id,owner_id,object_path) values(a.id,u,a.object_path);
 return a;
end $$;
revoke all on function public.prepare_attachment(uuid,text,bigint,text) from public,anon;
grant execute on function public.prepare_attachment(uuid,text,bigint,text) to authenticated;

alter function private.check_payload(text,jsonb) rename to check_payload_v1;
create function private.check_payload(k text,p jsonb) returns void language plpgsql set search_path='' as $$
declare f text;
begin
 if exists(select 1 from jsonb_each(p) e where jsonb_typeof(e.value) not in ('string','number','boolean')) then raise exception 'Payload fields must be scalar values'; end if;
 foreach f in array array['minimum','maximum','score','baseline','cost_usd','sample_count','repetitions'] loop
   if length(coalesce(p->>f,''))>64 then raise exception 'Numeric value too large: %',f; end if;
 end loop;
 perform private.check_payload_v1(k,p);
end $$;
revoke all on function private.check_payload(text,jsonb) from public,anon,authenticated;

-- Serialize publication decisions and archiving, including dependency checks.
alter function public.decide_submission(uuid,integer,text,text,text) rename to decide_submission_unlocked;
revoke all on function public.decide_submission_unlocked(uuid,integer,text,text,text) from public,anon,authenticated;
create function public.decide_submission(p_id uuid,p_lock integer,p_decision text,p_message text,p_internal text default '')
returns uuid language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('atlas-publication-workflow',0));
 return public.decide_submission_unlocked(p_id,p_lock,p_decision,p_message,p_internal);
end $$;
revoke all on function public.decide_submission(uuid,integer,text,text,text) from public,anon;
grant execute on function public.decide_submission(uuid,integer,text,text,text) to authenticated;
alter function public.archive_publication(uuid,text) rename to archive_publication_unlocked;
revoke all on function public.archive_publication_unlocked(uuid,text) from public,anon,authenticated;
create function public.archive_publication(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('atlas-publication-workflow',0));
 if p_reason is null or length(p_reason)>4000 then raise exception 'Reason required (up to 4000 characters)'; end if;
 perform public.archive_publication_unlocked(p_id,p_reason);
end $$;
revoke all on function public.archive_publication(uuid,text) from public,anon;
grant execute on function public.archive_publication(uuid,text) to authenticated;

create function public.release_review(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$
declare s public.submissions;
begin
 if not private.can_review() then raise exception 'Reviewer with MFA required'; end if;
 select * into s from public.submissions where id=p_id for update;
 if not found or s.owner_id=auth.uid() or s.status<>'in_review' then raise exception 'Active non-self review required'; end if;
 if s.reviewer_id<>auth.uid() and exists(select 1 from private.reviewers where user_id=s.reviewer_id) then raise exception 'Only assigned reviewer can release'; end if;
 if p_reason is null or length(btrim(p_reason))<3 or length(p_reason)>4000 then raise exception 'Reason required'; end if;
 update public.submissions set status='submitted',reviewer_id=null,lock_version=lock_version+1,updated_at=now() where id=p_id;
 insert into public.review_events(submission_id,revision,actor_id,action,message) values(p_id,s.revision,auth.uid(),'review_released',p_reason);
end $$;
revoke all on function public.release_review(uuid,text) from public,anon;
grant execute on function public.release_review(uuid,text) to authenticated;

create index publications_catalog on public.publications(kind,published_at desc) where is_current and not archived;
create index publications_protocol on public.publications(benchmark_id,published_at desc) where is_current and not archived;
