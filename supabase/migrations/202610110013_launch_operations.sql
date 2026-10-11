begin;
create table public.contact_messages (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 120),
 email text not null check(length(email) between 3 and 254),
 subject text not null check(length(trim(subject)) between 3 and 160),
 message text not null check(length(trim(message)) between 10 and 4000),
 status text not null default 'new' check(status in ('new','in_progress','resolved','spam')),
 internal_note text not null default '' check(length(internal_note)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index contact_messages_queue on public.contact_messages(status,created_at desc);
alter table public.contact_messages enable row level security;
grant select on public.contact_messages to authenticated;
grant all on public.contact_messages to service_role;
create policy contact_read on public.contact_messages for select to authenticated using(private.can_manage('content'));
create table private.contact_rate_limits (
 fingerprint text primary key, window_start timestamptz not null, attempts integer not null
);
revoke all on private.contact_rate_limits from public,anon,authenticated;
-- Only the server can submit, after verifying CAPTCHA. No anonymous RPC bypass.
create function public.submit_contact(p_name text,p_email text,p_subject text,p_message text,p_fingerprints text[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare f text; v_attempts integer; v_id uuid;
begin
 if cardinality(p_fingerprints)<>2 or p_fingerprints is null then raise exception 'Invalid submission'; end if;
 foreach f in array p_fingerprints loop
  if f is null or f !~ '^[a-f0-9]{64}$' then raise exception 'Invalid submission'; end if;
  insert into private.contact_rate_limits(fingerprint,window_start,attempts) values(f,now(),1)
  on conflict(fingerprint) do update set
   attempts=case when contact_rate_limits.window_start<now()-interval '1 hour' then 1 else contact_rate_limits.attempts+1 end,
   window_start=case when contact_rate_limits.window_start<now()-interval '1 hour' then now() else contact_rate_limits.window_start end
  returning attempts into v_attempts;
  if v_attempts>5 then raise exception 'CONTACT_RATE_LIMIT'; end if;
 end loop;
 insert into public.contact_messages(name,email,subject,message) values(trim(p_name),lower(trim(p_email)),trim(p_subject),trim(p_message)) returning id into v_id;
 delete from private.contact_rate_limits where window_start<now()-interval '1 day';
 return v_id;
end $$;
revoke all on function public.submit_contact(text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.submit_contact(text,text,text,text,text[]) to service_role;
create function public.review_contact(p_id uuid,p_status text,p_note text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage('content') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_status is null or p_status not in ('new','in_progress','resolved','spam') or p_note is null or length(p_note)>2000 then raise exception 'Invalid status or note'; end if;
 update public.contact_messages set status=p_status,internal_note=trim(p_note),updated_at=now() where id=p_id;
 if not found then raise exception 'Message not found'; end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'contact.'||p_status,p_id);
end $$;
revoke all on function public.review_contact(uuid,text,text) from public,anon;
grant execute on function public.review_contact(uuid,text,text) to authenticated;

create table public.maintenance_health (
 name text primary key check(name='daily'), started_at timestamptz not null default now(),
 finished_at timestamptz, status text not null check(status in ('running','ok','failed'))
);
alter table public.maintenance_health enable row level security;
grant select on public.maintenance_health to authenticated;
grant all on public.maintenance_health to service_role;
create policy maintenance_owner on public.maintenance_health for select to authenticated using(private.is_super_admin());
create function public.admin_operations() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_super_admin() then raise exception 'Access denied' using errcode='42501'; end if;
 return jsonb_build_object(
 'maintenance',(select to_jsonb(h) from public.maintenance_health h where name='daily'),
 'emails',(select coalesce(jsonb_agg(e),'[]'::jsonb) from (select id,kind,status,attempts,created_at,next_attempt_at,last_error from public.email_outbox where status<>'sent' order by created_at limit 50)e),
 'email_counts',(select coalesce(jsonb_object_agg(status,total),'{}'::jsonb) from (select status,count(*) as total from public.email_outbox group by status)c),
 'cleanup_pending',(select count(*) from public.storage_cleanup));
end $$;
create function public.retry_failed_email(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not private.is_super_admin() then raise exception 'Access denied' using errcode='42501'; end if;
 update public.email_outbox set status='queued',attempts=0,next_attempt_at=now(),lease_until=null,last_error=null where id=p_id and status='failed';
 if not found then raise exception 'Only failed messages can be retried'; end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'email.retry',p_id);
end $$;
revoke all on function public.admin_operations(),public.retry_failed_email(uuid) from public,anon;
grant execute on function public.admin_operations(),public.retry_failed_email(uuid) to authenticated;

-- Counts come from stored business records, not client-supplied conversion events.
create function public.admin_analytics(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare since timestamptz; result jsonb='{}'::jsonb;
begin
 if not private.email_verified() or not exists(select 1 from public.admin_memberships m join public.worker_accounts w using(user_id) where m.user_id=auth.uid() and m.active and w.approval<>'inactive') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_days is null or p_days not in (7,30,90) then raise exception 'Invalid period'; end if;
 since=now()-make_interval(days=>p_days);
 if private.can_manage('users') then
  result=result||jsonb_build_object('registrations',(select count(*) from auth.users where created_at>=since),'verified_registrations',(select count(*) from auth.users where created_at>=since and email_confirmed_at is not null));
 end if;
 if private.can_manage('jobs') then
  result=result||jsonb_build_object('applications',(select count(*) from public.applications where created_at>=since));
 end if;
 if private.can_manage('content') then
  result=result||jsonb_build_object('contact_submissions',(select count(*) from public.contact_messages where created_at>=since and status<>'spam'));
 end if;
 if private.can_manage('orders') then
  result=result||jsonb_build_object(
   'orders_created',(select count(*) from public.orders where created_at>=since),
   'paid_orders',(select count(*) from public.orders where paid_at>=since and payment_status='paid'),
   'paid_total_minor',(select coalesce(sum(total_minor),0) from public.orders where paid_at>=since and payment_status='paid'),
   'refunded_orders',(select count(*) from public.orders where created_at>=since and payment_status='refunded'),
   'daily_paid',(select coalesce(jsonb_agg(row),'[]'::jsonb) from (select (paid_at at time zone 'Africa/Lagos')::date as day,count(*) as orders,sum(total_minor) as total_minor from public.orders where paid_at>=since and payment_status='paid' group by 1 order by 1)row));
 end if;
 return result;
end $$;
revoke all on function public.admin_analytics(integer) from public,anon;
grant execute on function public.admin_analytics(integer) to authenticated;
create or replace function public.admin_attention() returns table(key text,label text,total bigint,href text,description text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.email_verified() or not exists(select 1 from public.admin_memberships m join public.worker_accounts w using(user_id) where m.user_id=auth.uid() and m.active and w.approval<>'inactive') then raise exception 'Access denied' using errcode='42501'; end if;
 if private.can_manage('users') then
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
commit;
