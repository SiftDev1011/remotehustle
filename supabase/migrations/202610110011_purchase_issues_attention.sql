begin;
create table public.purchase_issues (
 id uuid primary key default gen_random_uuid(),
 order_id uuid not null references public.orders(id) on delete cascade,
 category text not null check(category in ('download','file','payment','other')),
 message text not null check(length(trim(message)) between 5 and 2000),
 status text not null default 'open' check(status in ('open','in_review','resolved')),
 admin_reply text not null default '' check(length(admin_reply)<=2000),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create unique index purchase_issues_one_active on public.purchase_issues(order_id) where status <> 'resolved';
create index purchase_issues_order on public.purchase_issues(order_id,created_at desc);
create index purchase_issues_queue on public.purchase_issues(status,created_at);
alter table public.purchase_issues enable row level security;
grant select on public.purchase_issues to authenticated;
grant all on public.purchase_issues to service_role;
create policy purchase_issues_read on public.purchase_issues for select to authenticated using(private.can_read_order(order_id));

create function public.report_purchase_issue(p_order_id uuid,p_category text,p_message text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 -- Serialize per customer as well as per order, including the daily support limit.
 perform 1 from public.worker_accounts where user_id=auth.uid() and approval<>'inactive' for update;
 if not found or not private.email_verified() then raise exception 'Verify your email and use an active account to contact support' using errcode='42501'; end if;
 perform 1 from public.orders where id=p_order_id and user_id=auth.uid() for update;
 if not found then raise exception 'Order not found' using errcode='42501'; end if;
 if p_category is null or p_category not in ('download','file','payment','other') or p_message is null or length(trim(p_message)) not between 5 and 2000 then raise exception 'Choose an issue type and describe the problem (5–2,000 characters)'; end if;
 if exists(select 1 from public.purchase_issues where order_id=p_order_id and status<>'resolved') then raise exception 'An issue is already open for this order. Check its status below.'; end if;
 if (select count(*) from public.purchase_issues i join public.orders o on o.id=i.order_id where o.user_id=auth.uid() and i.created_at>now()-interval '1 day')>=5 then raise exception 'You have reached the daily support request limit. Please try again tomorrow.'; end if;
 insert into public.purchase_issues(order_id,category,message) values(p_order_id,p_category,trim(p_message)) returning id into v_id;
 return v_id;
end $$;
create function public.review_purchase_issue(p_id uuid,p_status text,p_reply text) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_order uuid;
begin
 if not private.can_manage('orders') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_status is null or p_status not in ('open','in_review','resolved') or p_reply is null or length(trim(p_reply))>2000 or (p_status='resolved' and length(trim(p_reply))<5) then raise exception 'Choose a valid status and include a reply when resolving an issue (5–2,000 characters)'; end if;
 select order_id into v_order from public.purchase_issues where id=p_id for update;
 if not found then raise exception 'Issue not found'; end if;
 update public.purchase_issues set status=p_status,admin_reply=trim(p_reply),updated_at=now() where id=p_id;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'purchase_issue.'||p_status,p_id);
 return v_order;
end $$;
revoke all on function public.report_purchase_issue(uuid,text,text),public.review_purchase_issue(uuid,text,text) from public,anon;
grant execute on function public.report_purchase_issue(uuid,text,text),public.review_purchase_issue(uuid,text,text) to authenticated;
-- Retain historical accounting records and duplicate-charge correction machinery.
-- Customers can no longer create a voluntary refund via the old endpoint.
revoke execute on function public.request_refund(uuid,text) from public,anon,authenticated;

create function public.admin_attention() returns table(key text,label text,total bigint,href text,description text)
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
 if private.can_manage('content') then
  return query select 'policies','Shop policy needs publishing',case when exists(select 1 from public.site_content c where c.key='commerce' and c.published and length(trim(coalesce(c.value->>'refund_policy','')))>=20) then 0 else 1 end::bigint,'/admin/content','Publish the purchase support and download policy to enable checkout.';
 end if;
 if private.can_manage('partners') then
  return query select 'partner_logos','Partner logos missing',count(*),'/admin/partners','Add logos for active partnering organisations.' from public.partners where active and logo_url is null;
 end if;
end $$;
revoke all on function public.admin_attention() from public,anon;
grant execute on function public.admin_attention() to authenticated;
commit;
