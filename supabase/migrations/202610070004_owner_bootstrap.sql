begin;
create function public.bootstrap_workspace_owner(p_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_user uuid;
begin
  perform pg_advisory_xact_lock(740071001);
  if exists(select 1 from public.admin_memberships where role = 'super_admin') then raise exception 'A workspace owner already exists'; end if;
  select id into v_user from auth.users where lower(email) = lower(trim(p_email)) and email_confirmed_at is not null;
  if v_user is null then raise exception 'Register and verify the owner account first'; end if;
  insert into public.admin_memberships(user_id,role,areas,active)
    values(v_user,'super_admin','{users,jobs,shop,orders,partners,content}',true);
  update public.worker_accounts set approval = 'approved', updated_at = now() where user_id = v_user;
  insert into public.audit_log(action,entity_id) values('owner.bootstrap',v_user);
  return v_user;
end; $$;
revoke all on function public.bootstrap_workspace_owner(text) from public, anon, authenticated;
grant execute on function public.bootstrap_workspace_owner(text) to service_role;
commit;
