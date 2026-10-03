-- Called only after the Edge Function has downloaded and validated actual bytes.
create function public.finalize_attachment(p_id uuid,p_owner uuid,p_hash text,p_valid boolean)
returns void language plpgsql security definer set search_path='' as $$
declare a public.attachments; s public.submissions;
begin
 select * into a from public.attachments where id=p_id;
 select * into s from public.submissions where id=a.submission_id for update;
 if not found or a.owner_id<>p_owner or s.status<>'draft' or s.revision<>a.revision then raise exception 'Editable draft required'; end if;
 if p_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid hash'; end if;
 if not exists(select 1 from storage.objects where bucket_id='submission-evidence' and name=a.object_path) then raise exception 'Upload missing'; end if;
 update public.attachments set sha256=p_hash,status=case when p_valid then 'ready' else 'failed' end where id=p_id;
end $$;
revoke all on function public.finalize_attachment(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.finalize_attachment(uuid,uuid,text,boolean) to service_role;
