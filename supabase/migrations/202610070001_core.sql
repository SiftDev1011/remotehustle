-- Remote Hustle milestone 1. Run against a fresh Supabase project.
-- No shared credentials or commercial sample records are installed.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create type public.approval_status as enum ('pending', 'approved', 'inactive');
create type public.admin_area as enum ('users', 'jobs', 'shop', 'orders', 'partners', 'content');
create type public.employment_type as enum ('full-time', 'part-time', 'contract', 'internship');
create type public.job_status as enum ('draft', 'published', 'closed');
create type public.application_status as enum ('submitted', 'reviewing', 'shortlisted', 'rejected', 'hired');

create table public.job_categories (id uuid primary key default gen_random_uuid(), name text not null unique check (length(trim(name)) between 2 and 100), active boolean not null default true);
create table public.skills (id uuid primary key default gen_random_uuid(), name text not null unique check (length(trim(name)) between 2 and 100), active boolean not null default true);
create table public.locations (id uuid primary key default gen_random_uuid(), name text not null unique check (length(trim(name)) between 2 and 100), active boolean not null default true);
create table public.worker_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  approval public.approval_status not null default 'pending',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'super_admin')),
  areas public.admin_area[] not null default '{}', active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.cv_documents (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  original_name text not null check (length(original_name) between 1 and 180),
  mime_type text not null check (mime_type in ('application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  staging_key text not null unique, object_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'ready')),
  created_at timestamptz not null default now()
);
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '' check (length(full_name) <= 120),
  email text not null unique,
  phone text unique check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  location_id uuid references public.locations(id), category_id uuid references public.job_categories(id),
  experience text not null default '' check (length(experience) <= 5000),
  education text not null default '' check (length(education) <= 3000),
  linkedin_url text not null default '' check (linkedin_url = '' or linkedin_url ~ '^https://'),
  preferred_roles text[] not null default '{}', employment_preferences public.employment_type[] not null default '{}',
  interests text[] not null default '{}', cv_id uuid references public.cv_documents(id) on delete set null,
  terms_accepted_at timestamptz, terms_version text,
  marketing_consent boolean not null default false,
  updated_at timestamptz not null default now(),
  check (cardinality(preferred_roles) <= 20 and cardinality(interests) <= 20 and cardinality(employment_preferences) <= 4)
);
create table public.profile_skills (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  skill_id uuid not null references public.skills(id), primary key (user_id, skill_id)
);
create table public.jobs (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) between 3 and 180),
  company text not null check (length(trim(company)) between 2 and 180),
  description text not null check (length(trim(description)) between 20 and 15000),
  requirements text not null check (length(trim(requirements)) between 5 and 10000),
  category_id uuid references public.job_categories(id), location_id uuid references public.locations(id),
  employment_type public.employment_type not null,
  application_type text not null default 'internal' check (application_type in ('internal', 'external')),
  salary_min numeric check (salary_min >= 0), salary_max numeric check (salary_max >= 0),
  currency text not null default 'NGN' check (currency ~ '^[A-Z]{3}$'),
  salary_period text not null default 'month' check (salary_period in ('month', 'year', 'hour', 'project')),
  status public.job_status not null default 'draft', closes_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  search_document tsvector generated always as (to_tsvector('english', title || ' ' || company || ' ' || description || ' ' || requirements)) stored,
  check (salary_min is null or salary_max is null or salary_max >= salary_min)
);
-- External links have their own access rules so public listing queries cannot bypass the profile gate.
create table public.job_application_links (
  job_id uuid primary key references public.jobs(id) on delete cascade,
  url text not null check (url ~ '^https://' and length(url) <= 2048)
);
create table public.applications (
  id uuid primary key default gen_random_uuid(), job_id uuid not null references public.jobs(id),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  cv_id uuid not null references public.cv_documents(id), cover_note text not null default '' check (length(cover_note) <= 3000),
  status public.application_status not null default 'submitted',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (job_id, user_id)
);
create table public.application_events (
  id uuid primary key default gen_random_uuid(), application_id uuid not null references public.applications(id) on delete cascade,
  status public.application_status not null, actor_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create table public.programs (
  id uuid primary key default gen_random_uuid(), title text not null check (length(trim(title)) between 3 and 180),
  type text not null check (type in ('training', 'internship')), description text not null,
  link text check (link is null or link ~ '^https://'), published boolean not null default false,
  created_at timestamptz not null default now()
);
create table public.partners (
  id uuid primary key default gen_random_uuid(), name text not null check (length(trim(name)) between 2 and 180),
  logo_url text check (logo_url is null or logo_url ~ '^https://'), website_url text check (website_url is null or website_url ~ '^https://'),
  active boolean not null default true, created_at timestamptz not null default now()
);
create table public.site_content (
  key text primary key, value jsonb not null, published boolean not null default false, updated_at timestamptz not null default now()
);
create table public.audit_log (
  id uuid primary key default gen_random_uuid(), actor_id uuid references auth.users(id) on delete set null,
  action text not null, entity_id uuid, created_at timestamptz not null default now()
);
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(), recipient_id uuid references auth.users(id) on delete cascade,
  kind text not null check (kind in ('welcome', 'application-status', 'order-confirmation', 'download-link')),
  payload jsonb not null default '{}', dedupe_key text not null unique,
  status text not null default 'queued' check (status in ('queued', 'sending', 'sent', 'failed')),
  attempts integer not null default 0, next_attempt_at timestamptz not null default now(), lease_until timestamptz,
  provider_message_id text, last_error text, created_at timestamptz not null default now()
);
create table public.storage_cleanup (
  id uuid primary key default gen_random_uuid(), object_key text not null unique,
  created_at timestamptz not null default now()
);
create index jobs_search_idx on public.jobs using gin(search_document);
create index jobs_public_idx on public.jobs(status, created_at desc);
create index applications_user_idx on public.applications(user_id, created_at desc);
create index applications_job_idx on public.applications(job_id, status);
create index cv_owner_idx on public.cv_documents(owner_id, created_at desc);
create index email_pending_idx on public.email_outbox(status, next_attempt_at);

create function private.can_manage(p_area public.admin_area) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_memberships m where m.user_id = (select auth.uid())
    and m.active and (m.role = 'super_admin' or p_area = any(m.areas)));
$$;
create function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admin_memberships where user_id = (select auth.uid()) and active and role = 'super_admin');
$$;
create function private.email_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users where id = (select auth.uid()) and email_confirmed_at is not null);
$$;
create function private.profile_percent(p_user uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce((
    (case when length(trim(p.full_name)) > 0 then 1 else 0 end) +
    (case when length(trim(p.email)) > 0 then 1 else 0 end) +
    (case when length(trim(coalesce(p.phone, ''))) > 0 then 1 else 0 end) +
    (case when p.location_id is not null then 1 else 0 end) +
    (case when p.category_id is not null then 1 else 0 end) +
    (case when exists (select 1 from public.profile_skills where user_id = p.user_id) then 1 else 0 end) +
    (case when length(trim(p.experience)) > 0 then 1 else 0 end) +
    (case when length(trim(p.education)) > 0 then 1 else 0 end) +
    (case when exists (select 1 from public.cv_documents where id = p.cv_id and owner_id = p.user_id and status = 'ready') then 1 else 0 end) +
    (case when length(trim(p.linkedin_url)) > 0 then 1 else 0 end) +
    (case when cardinality(p.preferred_roles) > 0 then 1 else 0 end) +
    (case when cardinality(p.employment_preferences) > 0 then 1 else 0 end) +
    (case when cardinality(p.interests) > 0 then 1 else 0 end)
  ) * 100 / 13, 0) from public.profiles p where p.user_id = p_user;
$$;
create function private.ready_to_apply() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.email_verified() and exists (select 1 from public.worker_accounts a
    join public.profiles p on p.user_id = a.user_id where a.user_id = (select auth.uid())
    and a.approval = 'approved' and p.terms_accepted_at is not null
    and private.profile_percent(a.user_id) = 100);
$$;
create function private.can_read_profile(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_user = (select auth.uid()) or private.can_manage('users') or
    (private.can_manage('jobs') and exists (select 1 from public.applications where user_id = p_user));
$$;
create function private.can_read_cv(p_id uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_owner = (select auth.uid()) or private.can_manage('users') or
    (private.can_manage('jobs') and exists (select 1 from public.applications where cv_id = p_id));
$$;
create function private.canonical_phone(p_phone text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := regexp_replace(coalesce(p_phone, ''), '[\s()-]', '', 'g');
begin
  if v = '' then return null; end if;
  if v ~ '^0[789][0-9]{9}$' then v := '+234' || substring(v from 2);
  elsif v ~ '^234[789][0-9]{9}$' then v := '+' || v; end if;
  if v !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'Invalid phone number' using errcode = '22023'; end if;
  return v;
end; $$;
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare consent boolean := coalesce((new.raw_user_meta_data->>'consent')::boolean, false);
begin
  if new.invited_at is null and not consent then raise exception 'Terms consent is required'; end if;
  insert into public.worker_accounts(user_id) values(new.id);
  insert into public.profiles(user_id, full_name, email, phone, terms_accepted_at, terms_version, marketing_consent)
  values (new.id, left(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), 120), lower(new.email),
    private.canonical_phone(new.raw_user_meta_data->>'phone'),
    case when consent then now() else null end, case when consent then '2026-10-07' else null end,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false));
  return new;
end; $$;
create trigger remote_hustle_new_user after insert on auth.users for each row execute function private.handle_new_user();
create function private.sync_email() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = lower(new.email), updated_at = now() where user_id = new.id;
  end if;
  return new;
end; $$;
create trigger remote_hustle_sync_email after update of email on auth.users for each row execute function private.sync_email();
create function private.queue_file_cleanup() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.storage_cleanup(object_key) values(old.staging_key), (old.object_key) on conflict do nothing;
  return old;
end; $$;
create trigger remote_hustle_file_cleanup before delete on public.cv_documents for each row execute function private.queue_file_cleanup();

-- Protected writes use narrow RPCs. Browser keys never get general write grants.
create function public.save_profile(p_user_id uuid, p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v_skill uuid; v_skills uuid[]; v_location uuid; v_category uuid;
begin
  if auth.uid() is null or not (p_user_id = auth.uid() or private.can_manage('users')) then raise exception 'Access denied' using errcode = '42501'; end if;
  if not private.email_verified() then raise exception 'Verify your email first' using errcode = '42501'; end if;
  if exists (select 1 from public.worker_accounts where user_id = auth.uid() and approval = 'inactive') then raise exception 'Account inactive' using errcode = '42501'; end if;
  if length(trim(p_data->>'full_name')) not between 2 and 120 then raise exception 'Full name is required'; end if;
  v_location := nullif(p_data->>'location_id', '')::uuid; v_category := nullif(p_data->>'category_id', '')::uuid;
  if v_location is not null and not exists (select 1 from public.locations where id = v_location and active) then raise exception 'Choose an active location'; end if;
  if v_category is not null and not exists (select 1 from public.job_categories where id = v_category and active) then raise exception 'Choose an active category'; end if;
  v_skills := array(select distinct value::uuid from jsonb_array_elements_text(coalesce(p_data->'skill_ids', '[]')));
  if cardinality(v_skills) > 30 then raise exception 'Choose at most 30 skills'; end if;
  foreach v_skill in array v_skills loop
    if not exists (select 1 from public.skills where id = v_skill and active) then raise exception 'Choose active skills'; end if;
  end loop;
  update public.profiles set full_name = trim(p_data->>'full_name'), phone = private.canonical_phone(p_data->>'phone'),
    location_id = v_location, category_id = v_category, experience = coalesce(p_data->>'experience', ''),
    education = coalesce(p_data->>'education', ''), linkedin_url = coalesce(p_data->>'linkedin_url', ''),
    preferred_roles = array(select distinct trim(value) from jsonb_array_elements_text(coalesce(p_data->'preferred_roles', '[]')) where length(trim(value)) between 1 and 100),
    employment_preferences = array(select value::public.employment_type from jsonb_array_elements_text(coalesce(p_data->'employment_preferences', '[]'))),
    interests = array(select distinct trim(value) from jsonb_array_elements_text(coalesce(p_data->'interests', '[]')) where length(trim(value)) between 1 and 100),
    marketing_consent = case when p_user_id = auth.uid() then coalesce((p_data->>'marketing_consent')::boolean, false) else marketing_consent end,
    updated_at = now()
    where user_id = p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  delete from public.profile_skills where user_id = p_user_id;
  insert into public.profile_skills(user_id, skill_id) select p_user_id, unnest(v_skills);
  if p_user_id <> auth.uid() then
    insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'profile.corrected',p_user_id);
  end if;
end; $$;

create function public.prepare_cv_upload(p_name text, p_type text, p_size bigint) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := gen_random_uuid(); v_ext text := lower(split_part(reverse(p_name), '.', 1)); v_owner uuid := auth.uid();
begin
  v_ext := reverse(v_ext);
  if v_owner is null or not private.email_verified() or exists(select 1 from public.worker_accounts where user_id = v_owner and approval = 'inactive') then raise exception 'Access denied' using errcode = '42501'; end if;
  if not ((v_ext = 'pdf' and p_type = 'application/pdf') or (v_ext = 'doc' and p_type = 'application/msword') or
    (v_ext = 'docx' and p_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) then raise exception 'Unsupported file type'; end if;
  if (select count(*) from public.cv_documents where owner_id = v_owner and created_at > now() - interval '1 day') >= 12 then raise exception 'Upload limit reached. Try again tomorrow.'; end if;
  insert into public.cv_documents(id, owner_id, original_name, mime_type, size_bytes, staging_key, object_key)
  values(v_id, v_owner, p_name, p_type, p_size, 'staging/' || v_owner || '/' || v_id || '.' || v_ext, 'cvs/' || v_owner || '/' || v_id || '.' || v_ext);
  return v_id;
end; $$;
-- Only the server can complete an upload after inspecting its bytes and writing the immutable final object.
create function public.finalize_cv_upload(p_id uuid, p_owner uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.cv_documents;
begin
  select * into v from public.cv_documents where id = p_id and owner_id = p_owner for update;
  if not found or v.status <> 'pending' or v.created_at < now() - interval '30 minutes' then raise exception 'Upload expired or already completed'; end if;
  update public.cv_documents set status = 'ready' where id = p_id;
  update public.profiles set cv_id = p_id, updated_at = now() where user_id = p_owner;
  insert into public.storage_cleanup(object_key) values(v.staging_key) on conflict do nothing;
end; $$;

create function public.set_worker_approval(p_user_id uuid, p_status public.approval_status) returns void
language plpgsql security definer set search_path = '' as $$
declare v_old public.approval_status;
begin
  if not private.can_manage('users') then raise exception 'Access denied' using errcode = '42501'; end if;
  if exists(select 1 from public.admin_memberships where user_id = p_user_id) then raise exception 'Manage administrator access separately'; end if;
  select approval into v_old from public.worker_accounts where user_id = p_user_id for update;
  if not found then raise exception 'User not found'; end if;
  update public.worker_accounts set approval = p_status, updated_at = now() where user_id = p_user_id;
  insert into public.audit_log(actor_id, action, entity_id) values(auth.uid(), 'worker.' || p_status, p_user_id);
  if p_status = 'approved' and v_old <> 'approved' then
    insert into public.email_outbox(recipient_id, kind, dedupe_key) values(p_user_id, 'welcome', 'welcome:' || p_user_id) on conflict do nothing;
  end if;
end; $$;
create function public.set_admin_access(p_user_id uuid, p_areas public.admin_area[], p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Super admin access required' using errcode = '42501'; end if;
  if exists(select 1 from public.admin_memberships where user_id = p_user_id and role = 'super_admin') then raise exception 'Owner access cannot be changed here'; end if;
  if cardinality(p_areas) = 0 then raise exception 'Select at least one access area'; end if;
  insert into public.admin_memberships(user_id, role, areas, active) values(p_user_id, 'admin', p_areas, p_active)
    on conflict(user_id) do update set areas = excluded.areas, active = excluded.active;
  update public.worker_accounts set approval = 'approved', updated_at = now() where user_id = p_user_id;
  insert into public.audit_log(actor_id, action, entity_id) values(auth.uid(), 'admin.access', p_user_id);
end; $$;

create function public.save_job(p_id uuid, p_data jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := coalesce(p_id, gen_random_uuid()); v_url text := nullif(trim(p_data->>'application_url'), '');
begin
  if not private.can_manage('jobs') then raise exception 'Access denied' using errcode = '42501'; end if;
  if p_id is not null and not exists (select 1 from public.jobs where id = p_id) then raise exception 'Job not found'; end if;
  if p_data->>'application_type' = 'external' and (v_url is null or v_url !~ '^https://') then raise exception 'External application link required'; end if;
  insert into public.jobs(id, title, company, description, requirements, category_id, location_id, employment_type,
    application_type, salary_min, salary_max, currency, salary_period, status, closes_at, created_by)
  values(v_id, trim(p_data->>'title'), trim(p_data->>'company'), trim(p_data->>'description'), trim(p_data->>'requirements'),
    nullif(p_data->>'category_id', '')::uuid, nullif(p_data->>'location_id', '')::uuid,
    (p_data->>'employment_type')::public.employment_type, p_data->>'application_type',
    nullif(p_data->>'salary_min', '')::numeric, nullif(p_data->>'salary_max', '')::numeric,
    p_data->>'currency', p_data->>'salary_period', (p_data->>'status')::public.job_status,
    nullif(p_data->>'closes_at', '')::timestamptz, auth.uid())
  on conflict(id) do update set title = excluded.title, company = excluded.company, description = excluded.description,
    requirements = excluded.requirements, category_id = excluded.category_id, location_id = excluded.location_id,
    employment_type = excluded.employment_type, application_type = excluded.application_type, salary_min = excluded.salary_min,
    salary_max = excluded.salary_max, currency = excluded.currency, salary_period = excluded.salary_period,
    status = excluded.status, closes_at = excluded.closes_at, updated_at = now();
  if p_data->>'application_type' = 'external' then
    insert into public.job_application_links(job_id, url) values(v_id, v_url) on conflict(job_id) do update set url = excluded.url;
  else delete from public.job_application_links where job_id = v_id; end if;
  insert into public.audit_log(actor_id, action, entity_id) values(auth.uid(), 'job.save', v_id);
  return v_id;
end; $$;
create function public.submit_application(p_job_id uuid, p_cover_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_job public.jobs; v_id uuid := gen_random_uuid(); v_cv uuid;
begin
  if not private.ready_to_apply() then raise exception 'Verify your email, receive approval and complete your profile first' using errcode = '42501'; end if;
  select * into v_job from public.jobs where id = p_job_id for share;
  if not found or v_job.status <> 'published' or (v_job.closes_at is not null and v_job.closes_at <= now()) then raise exception 'This job is no longer accepting applications'; end if;
  if v_job.application_type <> 'internal' then raise exception 'Apply on the company website'; end if;
  select cv_id into v_cv from public.profiles where user_id = auth.uid();
  insert into public.applications(id, job_id, user_id, cv_id, cover_note) values(v_id, p_job_id, auth.uid(), v_cv, coalesce(p_cover_note, ''));
  insert into public.application_events(application_id, status, actor_id) values(v_id, 'submitted', auth.uid());
  return v_id;
end; $$;
create function public.set_application_status(p_id uuid, p_status public.application_status) returns void
language plpgsql security definer set search_path = '' as $$
declare v public.applications; v_event uuid := gen_random_uuid(); v_title text;
begin
  if not private.can_manage('jobs') then raise exception 'Access denied' using errcode = '42501'; end if;
  select * into v from public.applications where id = p_id for update;
  if not found then raise exception 'Application not found'; end if;
  if v.status = p_status then return; end if;
  update public.applications set status = p_status, updated_at = now() where id = p_id;
  insert into public.application_events(id, application_id, status, actor_id) values(v_event, p_id, p_status, auth.uid());
  select title into v_title from public.jobs where id = v.job_id;
  insert into public.email_outbox(recipient_id, kind, payload, dedupe_key)
  values(v.user_id, 'application-status', jsonb_build_object('application_id', p_id, 'job_title', v_title, 'status', p_status), 'application:' || v_event);
  insert into public.audit_log(actor_id, action, entity_id) values(auth.uid(), 'application.' || p_status, p_id);
end; $$;

create function public.claim_email_outbox(p_limit integer default 10)
returns setof public.email_outbox language sql security definer set search_path = '' as $$
  update public.email_outbox set status = 'sending', attempts = attempts + 1, lease_until = now() + interval '5 minutes'
  where id in (select id from public.email_outbox where attempts < 8 and next_attempt_at <= now()
    and (status = 'queued' or (status = 'sending' and lease_until < now()))
    order by created_at for update skip locked limit least(greatest(p_limit, 1), 20)) returning *;
$$;

-- Explicit grants and policies on every exposed table.
do $$ declare t text; begin
  foreach t in array array['job_categories','skills','locations','worker_accounts','admin_memberships','cv_documents','profiles','profile_skills','jobs','job_application_links','applications','application_events','programs','partners','site_content','audit_log','email_outbox','storage_cleanup'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
end $$;
grant select on public.job_categories, public.skills, public.locations, public.jobs, public.programs, public.partners, public.site_content to anon, authenticated;
grant select on public.worker_accounts, public.admin_memberships, public.cv_documents, public.profiles, public.profile_skills, public.job_application_links, public.applications, public.application_events, public.audit_log to authenticated;
grant insert, update, delete on public.job_categories, public.skills, public.locations, public.programs, public.partners, public.site_content to authenticated;

create policy categories_read on public.job_categories for select to anon, authenticated using (active or private.can_manage('jobs'));
create policy skills_read on public.skills for select to anon, authenticated using (active or private.can_manage('jobs'));
create policy locations_read on public.locations for select to anon, authenticated using (active or private.can_manage('jobs'));
create policy categories_write on public.job_categories for all to authenticated using (private.can_manage('jobs')) with check(private.can_manage('jobs'));
create policy skills_write on public.skills for all to authenticated using (private.can_manage('jobs')) with check(private.can_manage('jobs'));
create policy locations_write on public.locations for all to authenticated using (private.can_manage('jobs')) with check(private.can_manage('jobs'));
create policy accounts_read on public.worker_accounts for select to authenticated using (private.can_read_profile(user_id));
create policy admins_read on public.admin_memberships for select to authenticated using(user_id = auth.uid() or private.is_super_admin());
create policy profile_read on public.profiles for select to authenticated using (private.can_read_profile(user_id));
create policy profile_skills_read on public.profile_skills for select to authenticated using (private.can_read_profile(user_id));
create policy cv_read on public.cv_documents for select to authenticated using (private.can_read_cv(id, owner_id));
create policy jobs_read on public.jobs for select to anon, authenticated using (
  (status = 'published' and (closes_at is null or closes_at > now())) or private.can_manage('jobs'));
create policy application_links_read on public.job_application_links for select to authenticated using (
  private.can_manage('jobs') or (private.ready_to_apply() and exists(select 1 from public.jobs where id = job_id and status = 'published' and (closes_at is null or closes_at > now()))));
create policy applications_read on public.applications for select to authenticated using (user_id = auth.uid() or private.can_manage('jobs'));
create policy events_read on public.application_events for select to authenticated using (
  private.can_manage('jobs') or exists(select 1 from public.applications where id = application_id and user_id = auth.uid()));
create policy programs_read on public.programs for select to anon, authenticated using (published or private.can_manage('content'));
create policy programs_write on public.programs for all to authenticated using (private.can_manage('content')) with check(private.can_manage('content'));
create policy partners_read on public.partners for select to anon, authenticated using (active or private.can_manage('partners'));
create policy partners_write on public.partners for all to authenticated using (private.can_manage('partners')) with check(private.can_manage('partners'));
create policy content_read on public.site_content for select to anon, authenticated using(published or private.can_manage('content'));
create policy content_write on public.site_content for all to authenticated using(private.can_manage('content')) with check(private.can_manage('content'));
create policy audit_read on public.audit_log for select to authenticated using(private.is_super_admin());

-- Policies invoke helper functions even for public rows. Helpers expose only booleans.
revoke all on all functions in schema private from public;
grant usage on schema private to anon;
grant execute on function private.can_manage(public.admin_area) to anon, authenticated;
grant execute on function private.is_super_admin(), private.can_read_profile(uuid), private.can_read_cv(uuid, uuid), private.ready_to_apply(), private.email_verified() to authenticated;
revoke all on function public.save_profile(uuid,jsonb), public.prepare_cv_upload(text,text,bigint), public.finalize_cv_upload(uuid,uuid), public.set_worker_approval(uuid,public.approval_status), public.set_admin_access(uuid,public.admin_area[],boolean), public.save_job(uuid,jsonb), public.submit_application(uuid,text), public.set_application_status(uuid,public.application_status), public.claim_email_outbox(integer) from public, anon, authenticated;
grant execute on function public.save_profile(uuid,jsonb), public.prepare_cv_upload(text,text,bigint), public.set_worker_approval(uuid,public.approval_status), public.set_admin_access(uuid,public.admin_area[],boolean), public.save_job(uuid,jsonb), public.submit_application(uuid,text), public.set_application_status(uuid,public.application_status) to authenticated;
grant execute on function public.finalize_cv_upload(uuid,uuid), public.claim_email_outbox(integer) to service_role;
commit;
