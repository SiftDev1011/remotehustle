begin;
-- Only future registrations change version; prior consent records remain untouched.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare consent boolean := coalesce((new.raw_user_meta_data->>'consent')::boolean, false);
begin
  if new.invited_at is null and not consent then raise exception 'Terms consent is required'; end if;
  insert into public.worker_accounts(user_id) values(new.id);
  insert into public.profiles(user_id, full_name, email, phone, terms_accepted_at, terms_version, marketing_consent)
  values (new.id, left(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), 120), lower(new.email),
    private.canonical_phone(new.raw_user_meta_data->>'phone'),
    case when consent then now() else null end, case when consent then '2026-10-11' else null end,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false));
  return new;
end; $$;
commit;
