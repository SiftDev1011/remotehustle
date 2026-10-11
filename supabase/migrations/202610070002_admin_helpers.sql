begin;
create function public.list_workers(p_search text default '', p_approval text default '', p_offset integer default 0)
returns table(user_id uuid, full_name text, email text, phone text, approval public.approval_status, email_verified boolean, created_at timestamptz, total_count bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.can_manage('users') then raise exception 'Access denied' using errcode = '42501'; end if;
  return query select p.user_id, p.full_name, p.email, p.phone, a.approval, u.email_confirmed_at is not null, a.created_at, count(*) over()
  from public.profiles p join public.worker_accounts a on a.user_id = p.user_id join auth.users u on u.id = p.user_id
  where (p_approval = '' or a.approval::text = p_approval)
    and (trim(p_search) = '' or p.full_name ilike '%' || left(trim(p_search),150) || '%' or p.email ilike '%' || left(trim(p_search),150) || '%' or p.phone ilike '%' || left(trim(p_search),150) || '%')
  order by a.created_at desc limit 50 offset greatest(p_offset,0);
end; $$;
create function public.assert_worker_deletion(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage('users') or auth.uid() = p_user_id then raise exception 'Access denied' using errcode = '42501'; end if;
  if exists(select 1 from public.admin_memberships where user_id = p_user_id) then raise exception 'Manage administrator access separately'; end if;
  if not exists(select 1 from public.worker_accounts where user_id = p_user_id) then raise exception 'User not found'; end if;
  insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'worker.delete_requested',p_user_id);
end; $$;
create function public.delete_job(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.can_manage('jobs') then raise exception 'Access denied' using errcode = '42501'; end if;
  if exists(select 1 from public.applications where job_id = p_id) then raise exception 'This job has applicants. Close it instead of deleting.'; end if;
  delete from public.jobs where id = p_id;
  insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'job.delete',p_id);
end; $$;
revoke all on function public.list_workers(text,text,integer), public.assert_worker_deletion(uuid), public.delete_job(uuid) from public, anon, authenticated;
grant execute on function public.list_workers(text,text,integer), public.assert_worker_deletion(uuid), public.delete_job(uuid) to authenticated;
commit;
