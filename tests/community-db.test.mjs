import { PGlite } from '@electric-sql/pglite'
import { readFile, readdir } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { test } from 'node:test'

test('community permissions, frozen revisions, atomic review, attachments and publication visibility', async () => {
  const db = new PGlite()
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.uid',true),'')::uuid $$;
    create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('aal',current_setting('request.aal',true)) $$;
    grant usage on schema auth to anon,authenticated,service_role;
    grant execute on all functions in schema auth to anon,authenticated,service_role;
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant usage on schema storage to authenticated;
    grant select,insert,update,delete on storage.objects to authenticated;
  `)
  for (const name of (await readdir('supabase/migrations')).sort())
    await db.exec(await readFile(`supabase/migrations/${name}`, 'utf8'))
  const user = '00000000-0000-0000-0000-000000000001'
  const admin = '00000000-0000-0000-0000-000000000002'
  const other = '00000000-0000-0000-0000-000000000003'
  await db.exec(`insert into auth.users values('${user}'),('${admin}'),('${other}'); insert into private.reviewers(user_id) values('${admin}'),('${user}');`)
  async function as(id,aal='aal1') { await db.exec(`reset role; set role authenticated; set request.uid='${id}'; set request.aal='${aal}';`) }
  async function rpc(name, args) {
    return (await db.query(`select * from public.${name}(${args.map((_,i)=>`$${i+1}`).join(',')})`,args)).rows[0]
  }
  const payload={schema_version:1,title:'Test benchmark',summary:'Synthetic protocol',contributor:'Test author',source_url:'https://example.org',license:'CC-BY',version:'1',category:'Reasoning',metric:'Accuracy',unit:'%',direction:'higher',minimum:'0',maximum:'100',split:'test',evaluator:'commit abc',protocol:'No tools',attestation:true}
  const id='10000000-0000-0000-0000-000000000001'
  await as(user)
  let s=await rpc('save_submission',[id,'benchmark',payload,0,null])
  assert.equal(s.status,'draft')
  await as(other)
  assert.equal((await db.query('select * from public.submissions')).rows.length,0)
  await assert.rejects(rpc('save_submission',[id,'benchmark',payload,1,null]),/Not your/)
  await assert.rejects(db.exec(`update public.submissions set status='published'`),/permission denied/)
  await as(user)
  s=await rpc('save_submission',[id,'benchmark',{...payload,title:'Updated benchmark'},1,null])
  await assert.rejects(rpc('save_submission',[id,'benchmark',payload,1,null]),/Draft changed/)
  const a=await rpc('prepare_attachment',[id,'proof.json',20,'application/json'])
  await db.query(`insert into storage.objects(bucket_id,name) values('submission-evidence',$1)`,[a.object_path])
  await assert.rejects(rpc('submit_revision',[id,s.lock_version]),/pending attachments/)
  await assert.rejects(rpc('finalize_attachment',[a.id,user,'a'.repeat(64),true]),/permission denied/)
  await db.exec('reset role; set role service_role')
  await rpc('finalize_attachment',[a.id,user,'a'.repeat(64),true])
  await as(user)
  s=await rpc('submit_revision',[id,s.lock_version])
  assert.equal(s.status,'submitted')
  await assert.rejects(rpc('save_submission',[id,'benchmark',payload,s.lock_version,null]),/Draft changed/)
  await assert.rejects(rpc('prepare_attachment',[id,'new.json',20,'application/json']),/Editable draft/)
  await assert.rejects(rpc('remove_pending_attachment',[a.id]),/Editable draft/)
  assert.equal((await db.query('update storage.objects set name=name returning *')).rows.length,0)
  await as(other)
  assert.equal((await db.query('select * from storage.objects')).rows.length,0)
  await as(user,'aal2')
  await assert.rejects(rpc('claim_review',[id]),/own submission/)
  await as(admin)
  await assert.rejects(rpc('claim_review',[id]),/MFA/)
  await as(admin,'aal2')
  await rpc('claim_review',[id])
  s=(await db.query('select * from public.submissions where id=$1',[id])).rows[0]
  await rpc('decide_submission',[id,s.lock_version,'request_changes','Explain evaluator','Private note'])
  await as(user)
  assert.equal((await db.query('select * from public.review_notes')).rows.length,0)
  s=await rpc('revise_submission',[id]); assert.equal(s.revision,2)
  assert.equal((await db.query('select * from public.submission_revisions')).rows.length,1)
  s=await rpc('submit_revision',[id,s.lock_version])
  await as(admin,'aal2'); await rpc('claim_review',[id])
  s=(await db.query('select * from public.submissions where id=$1',[id])).rows[0]
  const pub=(await rpc('decide_submission',[id,s.lock_version,'approve','Evidence checked',''])).decide_submission
  assert.equal((await rpc('decide_submission',[id,s.lock_version,'approve','Evidence checked',''])).decide_submission,pub)
  assert.equal((await db.query('select * from public.publications')).rows.length,1)
  await as(user)
  await assert.rejects(db.exec('update public.publications set archived=false'),/permission denied/)
  const updateId='10000000-0000-0000-0000-000000000002'
  let update=await rpc('save_submission',[updateId,'benchmark',{...payload,version:'2'},0,pub])
  update=await rpc('submit_revision',[updateId,update.lock_version])
  await db.exec('reset role; set role anon; set request.uid=\'\'')
  assert.equal((await db.query('select * from public.publications where is_current')).rows[0].id,pub)
  await assert.rejects(db.exec('select * from public.submissions'),/permission denied/)
  await as(admin,'aal2'); await rpc('claim_review',[updateId])
  update=(await db.query('select * from public.submissions where id=$1',[updateId])).rows[0]
  await rpc('decide_submission',[updateId,update.lock_version,'approve','New protocol reviewed',''])
  assert.equal((await db.query('select * from public.publications')).rows.length,2)
  assert.equal((await db.query('select * from public.publications where is_current')).rows.length,1)
  // Live revocation must take effect without waiting for a refreshed JWT.
  await db.exec(`reset role; delete from private.reviewers where user_id='${admin}';`)
  await as(admin,'aal2'); await assert.rejects(rpc('archive_publication',[pub,'Incorrect evidence']),/MFA/)
  await db.exec(`reset role; insert into private.reviewers(user_id) values('${admin}');`)
  await as(admin,'aal2'); await rpc('archive_publication',[pub,'Incorrect evidence'])
  await db.exec('reset role; set role anon')
  assert.equal((await db.query('select * from public.publications')).rows.length,0)
  await db.close()
})
