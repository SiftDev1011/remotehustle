begin;
create or replace function private.can_manage(p_area public.admin_area) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_memberships m
    join auth.users u on u.id = m.user_id join public.worker_accounts a on a.user_id = m.user_id
    where m.user_id = (select auth.uid()) and m.active and u.email_confirmed_at is not null and a.approval <> 'inactive'
    and (m.role = 'super_admin' or p_area = any(m.areas)));
$$;
create or replace function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.can_manage('users') and exists(select 1 from public.admin_memberships where user_id = auth.uid() and role = 'super_admin');
$$;
create function private.has_application(p_job_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.applications where job_id = p_job_id and user_id = auth.uid());
$$;
revoke all on function private.has_application(uuid) from public;
grant execute on function private.has_application(uuid) to anon, authenticated;
drop policy jobs_read on public.jobs;
create policy jobs_read on public.jobs for select to anon, authenticated using (
  (status = 'published' and (closes_at is null or closes_at > now())) or private.can_manage('jobs') or private.has_application(id));
commit;
