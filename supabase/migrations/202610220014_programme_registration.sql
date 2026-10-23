begin;
create table public.registration_codes (
 id uuid primary key default gen_random_uuid(), label text not null check(length(trim(label)) between 2 and 120),
 code_hash text not null unique check(code_hash ~ '^[a-f0-9]{64}$'), active boolean not null default true,
 expires_at timestamptz, max_uses integer check(max_uses between 1 and 100000), uses integer not null default 0 check(uses>=0),
 created_at timestamptz not null default now(), created_by uuid references auth.users(id) on delete set null
);
alter table public.registration_codes enable row level security;
-- Even an authorised browser cannot read access-code hashes.
grant select(id,label,active,expires_at,max_uses,uses,created_at,created_by) on public.registration_codes to authenticated;
grant all on public.registration_codes to service_role;
create policy codes_admin_read on public.registration_codes for select to authenticated using(private.can_manage('users'));
create table public.programme_registrations (
 id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users(id) on delete cascade,
 email text not null, category_id uuid not null references public.job_categories(id), code_id uuid not null references public.registration_codes(id),
 data jsonb not null check(jsonb_typeof(data)='object' and length(data::text)<=10000),
 status text not null default 'submitted' check(status in ('submitted','reviewed')),
 agreement_version text not null default 'rh-1.0-2026-10-22',created_at timestamptz not null default now(),reviewed_at timestamptz,
 constraint programme_required_details check (
  coalesce(length(trim(data->>'full_name')) between 2 and 120,false) and
  coalesce(length(data->>'phone') between 8 and 16,false) and
  coalesce(length(trim(data->>'state')) between 2 and 120,false) and
  coalesce(length(trim(data->>'address')) between 5 and 500,false) and
  coalesce(length(trim(data->>'social_handles')) between 1 and 500,false) and
  coalesce(length(data->>'professional_platforms')<=1000,false) and
  coalesce((data->>'country') ~ '^[A-Z]{2}$',false) and
  coalesce((data->>'date_of_birth') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$',false) and
  coalesce(data->>'gender' in ('Female','Male','Non-binary','Other','Prefer not to say'),false) and
  coalesce(data->>'primary_platform' in ('Instagram','TikTok','Facebook','X','LinkedIn'),false) and
  coalesce(data->>'skill_level' in ('Beginner','Intermediate','Advanced','Expert'),false) and
  coalesce(data->>'heard_from' in ('Social media','Friend or family','School or community','Event or training','Search engine','Other'),false) and
  coalesce(data->'whatsapp_active'='true'::jsonb,false) and
  coalesce(data->'performance_agreement'='true'::jsonb,false) and
  coalesce(data->'community_agreement'='true'::jsonb,false) and
  coalesce(data->'privacy_acknowledged'='true'::jsonb,false)
 )
);
create index programme_registration_queue on public.programme_registrations(status,created_at desc,id);
alter table public.programme_registrations enable row level security;
grant select on public.programme_registrations to authenticated;
grant all on public.programme_registrations to service_role;
create policy registration_read on public.programme_registrations for select to authenticated using(
 private.can_manage('users') or (user_id=auth.uid() and private.email_verified() and exists(select 1 from public.worker_accounts w where w.user_id=auth.uid() and w.approval<>'inactive'))
);
create table private.registration_attempts(user_id uuid primary key references auth.users(id) on delete cascade,window_start timestamptz not null,attempts integer not null);
revoke all on private.registration_attempts from public,anon,authenticated;
create function public.create_registration_code(p_label text,p_hash text,p_max integer,p_expires timestamptz) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not private.can_manage('users') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_expires is not null and p_expires<=now() then raise exception 'Choose a future expiry'; end if;
 insert into public.registration_codes(label,code_hash,max_uses,expires_at,created_by) values(trim(p_label),p_hash,p_max,p_expires,auth.uid()) returning id into result;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'registration_code.create',result);
 return result;
end $$;
create function public.set_registration_code_active(p_id uuid,p_active boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage('users') then raise exception 'Access denied' using errcode='42501'; end if;
 update public.registration_codes set active=p_active where id=p_id;
 if not found then raise exception 'Code not found'; end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),case when p_active then 'registration_code.enable' else 'registration_code.disable' end,p_id);
end $$;
create function public.submit_programme_registration(p_category uuid,p_hash text,p_data jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result uuid; code public.registration_codes%rowtype; n integer; clean jsonb; k text; dob date;
begin
 if not private.email_verified() then raise exception 'Verify your email first' using errcode='42501'; end if;
 -- Serialize retries by one account, then serialize use of a shared invitation code.
 perform 1 from public.worker_accounts w where w.user_id=auth.uid() and w.approval<>'inactive' for update;
 if not found then raise exception 'Account unavailable' using errcode='42501'; end if;
 select id into result from public.programme_registrations where user_id=auth.uid();
 if result is not null then return jsonb_build_object('id',result); end if;
 insert into private.registration_attempts(user_id,window_start,attempts) values(auth.uid(),now(),1)
 on conflict(user_id) do update set attempts=case when registration_attempts.window_start<now()-interval '1 hour' then 1 else registration_attempts.attempts+1 end,
 window_start=case when registration_attempts.window_start<now()-interval '1 hour' then now() else registration_attempts.window_start end returning attempts into n;
 -- Return errors instead of raising here: the attempt counter must commit.
 if n>10 then return jsonb_build_object('error','Too many attempts. Please try again in an hour.'); end if;
 select * into code from public.registration_codes where code_hash=p_hash for update;
 if not found or not code.active or (code.expires_at is not null and code.expires_at<=now()) or (code.max_uses is not null and code.uses>=code.max_uses) then
  return jsonb_build_object('error','This access code is invalid, expired or fully used. Contact the organisers for a new code.');
 end if;
 if not exists(select 1 from public.job_categories where id=p_category and active) then return jsonb_build_object('error','Select an available category.'); end if;
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>10000 then return jsonb_build_object('error','Check your registration details.'); end if;
 clean='{}'::jsonb;
 foreach k in array array['full_name','date_of_birth','phone','whatsapp_active','gender','country','state','address','primary_platform','social_handles','skill_level','professional_platforms','performance_agreement','community_agreement','privacy_acknowledged','heard_from'] loop
  clean=clean||jsonb_build_object(k,p_data->k);
 end loop;
 -- Exception block rolls back only the invalid insert, not the attempt counter.
 begin
  dob=(clean->>'date_of_birth')::date;
  if dob is null or dob<date '1900-01-01' or dob>current_date then return jsonb_build_object('error','Enter a valid date of birth.'); end if;
  clean=jsonb_set(clean,'{phone}',to_jsonb(private.canonical_phone(clean->>'phone')));
  insert into public.programme_registrations(user_id,email,category_id,code_id,data)
   select auth.uid(),lower(email),p_category,code.id,clean from auth.users where id=auth.uid() returning id into result;
 exception when check_violation or not_null_violation or invalid_datetime_format or datetime_field_overflow or invalid_parameter_value then
  return jsonb_build_object('error','Check your required details and agreements.');
 end;
 update public.registration_codes set uses=uses+1 where id=code.id;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'programme_registration.submit',result);
 return jsonb_build_object('id',result);
end $$;
create function public.review_programme_registration(p_id uuid,p_reviewed boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage('users') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_reviewed is null then raise exception 'Choose a review status'; end if;
 update public.programme_registrations set status=case when p_reviewed then 'reviewed' else 'submitted' end,reviewed_at=case when p_reviewed then now() else null end where id=p_id;
 if not found then raise exception 'Registration not found'; end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),case when p_reviewed then 'programme_registration.review' else 'programme_registration.reopen' end,p_id);
end $$;
revoke all on function public.create_registration_code(text,text,integer,timestamptz),public.set_registration_code_active(uuid,boolean),public.submit_programme_registration(uuid,text,jsonb),public.review_programme_registration(uuid,boolean) from public,anon;
grant execute on function public.create_registration_code(text,text,integer,timestamptz),public.set_registration_code_active(uuid,boolean),public.submit_programme_registration(uuid,text,jsonb),public.review_programme_registration(uuid,boolean) to authenticated;

create or replace function public.admin_attention() returns table(key text,label text,total bigint,href text,description text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.email_verified() or not exists(select 1 from public.admin_memberships m join public.worker_accounts w using(user_id) where m.user_id=auth.uid() and m.active and w.approval<>'inactive') then raise exception 'Access denied' using errcode='42501'; end if;
 if private.can_manage('users') then
  return query select 'programme_registrations','Programme registrations',count(*),'/admin/registrations','Review new REMOTE HUSTLE 1.0 submissions.' from public.programme_registrations where status='submitted';
  return query select 'users','Users awaiting approval',count(*),'/admin/users?approval=pending','Review registration details and approve eligible users.' from public.worker_accounts w where w.approval='pending' and not exists(select 1 from public.admin_memberships m where m.user_id=w.user_id);
 end if;
 if private.can_manage('jobs') then
  return query select 'applications','New applications',count(*),'/admin/applicants?status=submitted','Review CVs and update application statuses.' from public.applications where status='submitted';
  return query select 'expired_jobs','Jobs past their closing date',count(*),'/admin/jobs?attention=expired','Close these listings or extend their closing date.' from public.jobs where status='published' and closes_at<=now();
 end if;
 if private.can_manage('orders') then
  return query select 'purchase_issues','Purchase issues',count(*),'/admin/purchase-issues','Open and in-review reports from customers.' from public.purchase_issues where status<>'resolved';
  return query select 'payments','Payments awaiting confirmation',count(*),'/admin/payments','Payment attempts unresolved for more than 15 minutes. Check the provider before contacting the customer.' from public.payment_attempts where state in ('initializing','pending') and created_at<now()-interval '15 minutes';
  return query select 'corrections','Payment corrections',count(*),'/admin/refunds?status=attention','Duplicate charges and existing financial cases needing a decision or provider check.' from public.refund_requests where status in ('requested','approved','needs_review','failed');
 end if;
 if private.can_manage('shop') then
  return query select 'product_files','Products missing a ready file',count(*),'/admin/products','Attach a ready digital file before these products can be purchased.' from public.products p where p.active and p.type='digital' and not exists(select 1 from public.product_files f join public.media_assets a on a.id=f.asset_id where f.product_id=p.id and a.status='ready');
 end if;
 if private.is_super_admin() then
  return query select 'email_failures','Failed service emails',count(*),'/admin/operations','Check Brevo configuration and retry failed messages.' from public.email_outbox where status='failed';
  return query select 'maintenance','Scheduled maintenance',case when exists(select 1 from public.maintenance_health where name='daily' and status='ok' and finished_at>now()-interval '26 hours') then 0 else 1 end::bigint,'/admin/operations','Check the last successful scheduled run.';
 end if;
 if private.can_manage('content') then
  return query select 'contact','Contact messages',count(*),'/admin/messages','Read and respond to new enquiries.' from public.contact_messages where status in ('new','in_progress');
  return query select 'policies','Shop policy needs publishing',case when exists(select 1 from public.site_content c where c.key='commerce' and c.published and length(trim(coalesce(c.value->>'refund_policy','')))>=20) then 0 else 1 end::bigint,'/admin/content','Publish the purchase support and download policy to enable checkout.';
 end if;
 if private.can_manage('partners') then
  return query select 'partner_logos','Partner logos missing',count(*),'/admin/partners','Add logos for active partnering organisations.' from public.partners where active and logo_url is null;
 end if;
end $$;

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
    case when consent then now() else null end, case when consent then '2026-10-22' else null end,
    coalesce((new.raw_user_meta_data->>'marketing_consent')::boolean, false));
  return new;
end; $$;

commit;
