begin;
create table public.products (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 160), description text not null check(length(description) between 10 and 8000),
 type text not null check(type in ('digital','physical')), price_minor integer not null check(price_minor between 100 and 100000000), currency text not null default 'NGN' check(currency='NGN'),
 image_url text check(image_url ~ '^https://'), active boolean not null default false, created_at timestamptz not null default now()
);
create table public.product_files(product_id uuid primary key references public.products(id) on delete cascade, asset_id uuid not null references public.media_assets(id));
create table public.shipping_rates (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 country text not null default 'NG' check(country='NG'), state text not null check(length(trim(state)) between 2 and 80),
 fee_minor integer not null check(fee_minor between 0 and 100000000), delivery_note text not null default '', active boolean not null default true
);
create table public.discounts (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code ~ '^[A-Z0-9_-]{3,32}$'),
 type text not null check(type in ('percent','fixed')), value integer not null check(value>0),
 minimum_minor integer not null default 0 check(minimum_minor>=0), starts_at timestamptz not null default now(), expires_at timestamptz,
 active boolean not null default true, check(type<>'percent' or value<=100), check(expires_at is null or expires_at>starts_at)
);
create table public.orders (
 id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete set null,
 request_key uuid not null, receipt_email text not null,
 subtotal_minor integer not null check(subtotal_minor>=0), discount_minor integer not null default 0 check(discount_minor>=0),
 shipping_minor integer not null default 0 check(shipping_minor>=0), total_minor integer not null check(total_minor>=0), currency text not null default 'NGN' check(currency='NGN'),
 discount_code text, shipping_name text, shipping_address jsonb, has_physical boolean not null,
 payment_status text not null default 'pending' check(payment_status in ('pending','failed','paid','refunded')),
 fulfillment_status text not null default 'processing' check(fulfillment_status in ('processing','shipped','delivered')),
 paid_reference text, tracking_note text not null default '', created_at timestamptz not null default now(), paid_at timestamptz,
 unique(user_id,request_key), check(total_minor=subtotal_minor-discount_minor+shipping_minor), check(discount_minor<=subtotal_minor)
);
create index orders_user_created on public.orders(user_id,created_at desc);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid references public.products(id) on delete set null, name text not null, type text not null check(type in ('physical','digital')),
 unit_minor integer not null check(unit_minor>=0), quantity integer not null check(quantity between 1 and 10),
 asset_id uuid references public.media_assets(id), check(type<>'digital' or asset_id is not null)
);
create table public.payment_attempts (
 reference text primary key, order_id uuid not null references public.orders(id), amount_minor integer not null, currency text not null default 'NGN',
 state text not null default 'initializing' check(state in ('initializing','pending','failed','paid','duplicate_paid')),
 checkout_url text check(checkout_url ~ '^https://'), lease_until timestamptz, created_at timestamptz not null default now(), checked_at timestamptz
);
create index payment_order on public.payment_attempts(order_id);
create table public.refund_requests (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id), payment_reference text not null unique references public.payment_attempts(reference),
 kind text not null default 'customer' check(kind in ('customer','duplicate')), reason text not null check(length(reason) between 5 and 2000),
 status text not null default 'requested' check(status in ('requested','approved','rejected','processing','refunded','failed','needs_review')),
 admin_note text not null default '', provider_id text unique, amount_minor integer not null check(amount_minor>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- All money mutations are narrow RPCs. A browser never writes totals or paid states.
do $$ declare t text; begin foreach t in array array['products','product_files','shipping_rates','discounts','orders','order_items','payment_attempts','refund_requests'] loop
 execute format('alter table public.%I enable row level security',t); execute format('grant all on public.%I to service_role',t);
end loop; end $$;
grant select on public.products,public.shipping_rates to anon,authenticated;
grant select on public.product_files,public.discounts,public.orders,public.order_items,public.payment_attempts,public.refund_requests to authenticated;
grant insert,update,delete on public.shipping_rates,public.discounts to authenticated;
create policy product_read on public.products for select to anon,authenticated using(active or private.can_manage('shop'));
create policy product_file_read on public.product_files for select to authenticated using(private.can_manage('shop'));
create policy shipping_read on public.shipping_rates for select to anon,authenticated using(active or private.can_manage('orders'));
create policy shipping_write on public.shipping_rates for all to authenticated using(private.can_manage('orders')) with check(private.can_manage('orders'));
create policy discount_admin on public.discounts for all to authenticated using(private.can_manage('shop')) with check(private.can_manage('shop'));
create function private.can_read_order(p_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.can_manage('orders') or exists(select 1 from public.orders o join public.worker_accounts w on w.user_id=o.user_id where o.id=p_id and o.user_id=auth.uid() and w.approval<>'inactive' and private.email_verified());
$$;
create policy order_read on public.orders for select to authenticated using(private.can_read_order(id));
create policy items_read on public.order_items for select to authenticated using(private.can_read_order(order_id));
create policy payment_read on public.payment_attempts for select to authenticated using(private.can_read_order(order_id));
create policy refunds_read on public.refund_requests for select to authenticated using(private.can_read_order(order_id));
grant execute on function private.can_read_order(uuid) to authenticated;

create function public.save_product(p_id uuid,p_data jsonb,p_asset uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not private.can_manage('shop') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_data->>'type'='digital' and not exists(select 1 from public.media_assets where id=p_asset and area='shop' and kind='digital' and status='ready') then raise exception 'Upload a digital file before saving this product'; end if;
 insert into public.products(id,name,description,type,price_minor,image_url,active) values(v_id,trim(p_data->>'name'),trim(p_data->>'description'),p_data->>'type',(p_data->>'price_minor')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,false))
 on conflict(id) do update set name=excluded.name,description=excluded.description,type=excluded.type,price_minor=excluded.price_minor,image_url=excluded.image_url,active=excluded.active;
 delete from public.product_files where product_id=v_id;
 if p_data->>'type'='digital' then insert into public.product_files(product_id,asset_id) values(v_id,p_asset); end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'product.save',v_id); return v_id;
end; $$;
create function public.create_order(p_request_key uuid,p_items jsonb,p_code text default '',p_shipping_id uuid default null,p_address jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_product public.products; v_asset uuid; v_qty integer; v_sub bigint:=0; v_discount bigint:=0; v_shipping integer:=0; v_physical boolean:=false; v_rate public.shipping_rates; v_code public.discounts; v_email text; begin
 if not private.ready_to_apply() then raise exception 'Verify your email, wait for approval and complete your profile before checkout'; end if;
 if p_request_key is null then raise exception 'Checkout identifier is required'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_key::text,0));
 select id into v_id from public.orders where user_id=auth.uid() and request_key=p_request_key;
 if found then return v_id; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'Choose between 1 and 20 products'; end if;
 if (select count(distinct x->>'id') from jsonb_array_elements(p_items) x)<>jsonb_array_length(p_items) then raise exception 'Duplicate cart products'; end if;
 for v_item in select * from jsonb_array_elements(p_items) loop
   select * into v_product from public.products where id=(v_item->>'id')::uuid and active for share;
   if not found then raise exception 'A product is no longer available'; end if;
   v_qty:=(v_item->>'quantity')::integer;
   if v_qty is null or v_qty not between 1 and 10 or (v_product.type='digital' and v_qty<>1) then raise exception 'Choose a valid quantity'; end if;
   if v_product.type='digital' and not exists(select 1 from public.product_files f join public.media_assets a on a.id=f.asset_id where f.product_id=v_product.id and a.status='ready') then raise exception 'A digital resource is unavailable'; end if;
   v_sub:=v_sub+v_product.price_minor::bigint*v_qty; v_physical:=v_physical or v_product.type='physical';
 end loop;
 if v_sub>100000000 then raise exception 'Order total is too large; please contact the team'; end if;
 if nullif(trim(p_code),'') is not null then
   select * into v_code from public.discounts where code=upper(trim(p_code)) and active and starts_at<=now() and (expires_at is null or expires_at>now()) for share;
   if not found or v_sub<v_code.minimum_minor then raise exception 'This discount code is invalid, expired or below its minimum spend'; end if;
   v_discount:=least(v_sub,case when v_code.type='fixed' then v_code.value else v_sub*v_code.value/100 end);
 end if;
 if v_physical then
   select * into v_rate from public.shipping_rates where id=p_shipping_id and active and country=p_address->>'country' and lower(trim(state))=lower(trim(p_address->>'state')) for share;
   if not found then raise exception 'Choose a delivery rate for your state'; end if;
   if coalesce(length(trim(p_address->>'name')),0)<2 or coalesce(length(trim(p_address->>'line1')),0)<5 or coalesce(length(trim(p_address->>'city')),0)<2 or coalesce(length(trim(p_address->>'phone')),0)<10 or length(p_address::text)>3000 then raise exception 'Complete the delivery address'; end if;
   v_shipping:=v_rate.fee_minor;
 end if;
 select email into v_email from public.profiles where user_id=auth.uid(); v_id:=gen_random_uuid();
 insert into public.orders(id,user_id,request_key,receipt_email,subtotal_minor,discount_minor,shipping_minor,total_minor,discount_code,shipping_name,shipping_address,has_physical)
 values(v_id,auth.uid(),p_request_key,v_email,v_sub,v_discount,v_shipping,v_sub-v_discount+v_shipping,v_code.code,case when v_physical then v_rate.name end,case when v_physical then p_address end,v_physical);
 for v_item in select * from jsonb_array_elements(p_items) loop
  select * into v_product from public.products where id=(v_item->>'id')::uuid;
  select asset_id into v_asset from public.product_files where product_id=v_product.id;
  insert into public.order_items(order_id,product_id,name,type,unit_minor,quantity,asset_id) values(v_id,v_product.id,v_product.name,v_product.type,v_product.price_minor,(v_item->>'quantity')::integer,case when v_product.type='digital' then v_asset end);
 end loop;
 -- Zero-total orders have no gateway transaction and cannot generate cash refunds.
 if v_sub-v_discount+v_shipping=0 then
  update public.orders set payment_status='paid',paid_at=now(),paid_reference='free-'||v_id where id=v_id;
  insert into public.email_outbox(recipient_id,kind,payload,dedupe_key) values(auth.uid(),'order-confirmation',jsonb_build_object('order_id',v_id,'reference',v_id),'order:'||v_id);
  if exists(select 1 from public.order_items where order_id=v_id and type='digital') then insert into public.email_outbox(recipient_id,kind,payload,dedupe_key) values(auth.uid(),'download-link',jsonb_build_object('order_id',v_id),'downloads:'||v_id); end if;
 end if;
 return v_id;
end; $$;
create function public.prepare_payment(p_order_id uuid) returns text language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_ref text; begin
 if not private.ready_to_apply() then raise exception 'Complete your profile and account approval before paying'; end if;
 select * into v_order from public.orders where id=p_order_id and user_id=auth.uid() for update;
 if not found then raise exception 'Order not found'; end if;
 if v_order.payment_status in ('paid','refunded') then raise exception 'This order has already been paid'; end if;
 select reference into v_ref from public.payment_attempts where order_id=p_order_id and state in ('initializing','pending') order by created_at desc limit 1;
 if found then return v_ref; end if;
 v_ref:='rh-'||replace(gen_random_uuid()::text,'-','');
 insert into public.payment_attempts(reference,order_id,amount_minor,currency) values(v_ref,p_order_id,v_order.total_minor,v_order.currency);
 update public.orders set payment_status='pending' where id=p_order_id; return v_ref;
end; $$;
create function public.claim_payment_initialization(p_reference text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.payment_attempts set lease_until=now()+interval '60 seconds' where reference=p_reference and state='initializing' and (lease_until is null or lease_until<now()); return found;
end; $$;
create function public.record_payment(p_reference text,p_state text,p_amount integer,p_currency text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_attempt public.payment_attempts; v_order public.orders; begin
 -- Lock the order first everywhere to serialize late callbacks and retries.
 select o.* into v_order from public.orders o join public.payment_attempts p on p.order_id=o.id where p.reference=p_reference for update of o;
 if not found then raise exception 'Unknown payment reference'; end if;
 select * into v_attempt from public.payment_attempts where reference=p_reference for update;
 if p_amount is distinct from v_attempt.amount_minor or p_currency is distinct from v_attempt.currency or p_amount<>v_order.total_minor then raise exception 'Payment amount or currency did not match'; end if;
 if p_state not in ('success','failed','pending') then raise exception 'Invalid payment state'; end if;
 update public.payment_attempts set checked_at=now() where reference=p_reference;
 if v_attempt.state in ('paid','duplicate_paid') then return v_order.id; end if;
 if p_state='success' then
  if v_order.paid_reference is not null and v_order.paid_reference<>p_reference then
   update public.payment_attempts set state='duplicate_paid' where reference=p_reference;
   insert into public.refund_requests(order_id,payment_reference,kind,reason,amount_minor) values(v_order.id,p_reference,'duplicate','Additional successful payment for an already paid order',p_amount) on conflict(payment_reference) do nothing;
  else
   update public.payment_attempts set state='paid' where reference=p_reference;
   update public.orders set payment_status='paid',paid_reference=p_reference,paid_at=now() where id=v_order.id;
   if v_order.user_id is not null then
    insert into public.email_outbox(recipient_id,kind,payload,dedupe_key) values(v_order.user_id,'order-confirmation',jsonb_build_object('order_id',v_order.id,'reference',p_reference),'order:'||v_order.id) on conflict(dedupe_key) do nothing;
    if exists(select 1 from public.order_items where order_id=v_order.id and type='digital') then insert into public.email_outbox(recipient_id,kind,payload,dedupe_key) values(v_order.user_id,'download-link',jsonb_build_object('order_id',v_order.id),'downloads:'||v_order.id) on conflict(dedupe_key) do nothing; end if;
   end if;
  end if;
 elsif p_state='failed' then
  update public.payment_attempts set state='failed' where reference=p_reference;
  if v_order.payment_status not in ('paid','refunded') and not exists(select 1 from public.payment_attempts where order_id=v_order.id and reference<>p_reference and state in ('initializing','pending')) then update public.orders set payment_status='failed' where id=v_order.id; end if;
 elsif v_attempt.state<>'failed' then update public.payment_attempts set state='pending' where reference=p_reference;
 end if;
 return v_order.id;
end; $$;
create function public.request_refund(p_order_id uuid,p_reason text) returns uuid language plpgsql security definer set search_path='' as $$
declare v_order public.orders; v_id uuid; begin
 select * into v_order from public.orders where id=p_order_id and user_id=auth.uid() and private.can_read_order(id) for update;
 if not found or v_order.payment_status<>'paid' or v_order.total_minor=0 then raise exception 'A paid order is required'; end if;
 insert into public.refund_requests(order_id,payment_reference,reason,amount_minor) values(v_order.id,v_order.paid_reference,trim(p_reason),v_order.total_minor) returning id into v_id;
 return v_id;
end; $$;
create function public.review_refund(p_id uuid,p_decision text,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage('orders') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_decision not in ('approved','rejected') or length(trim(p_note)) not between 3 and 2000 then raise exception 'Choose a decision and add a note'; end if;
 update public.refund_requests set status=p_decision,admin_note=trim(p_note),updated_at=now() where id=p_id and status='requested';
 if not found then raise exception 'This refund has already been reviewed'; end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'refund.'||p_decision,p_id);
end; $$;
create function public.claim_refund(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin update public.refund_requests set status='processing',updated_at=now() where id=p_id and status='approved'; return found; end; $$;
create function public.record_refund(p_id uuid,p_provider_id text,p_reference text,p_amount integer,p_currency text,p_state text) returns void language plpgsql security definer set search_path='' as $$
declare r public.refund_requests; begin
 select * into r from public.refund_requests where id=p_id for update;
 if not found or r.payment_reference is distinct from p_reference or r.amount_minor is distinct from p_amount or p_currency is distinct from 'NGN' or nullif(p_provider_id,'') is null then raise exception 'Refund verification did not match'; end if;
 if r.status not in ('processing','needs_review','failed','refunded') then raise exception 'Refund has not been initiated'; end if;
 if r.provider_id is not null and r.provider_id<>p_provider_id then raise exception 'Refund provider identifier did not match'; end if;
 if r.status='refunded' then return; end if;
 update public.refund_requests set provider_id=p_provider_id,status=case when p_state='processed' then 'refunded' when p_state='failed' then 'failed' when p_state in ('pending','processing') then 'processing' else 'needs_review' end,updated_at=now() where id=p_id;
 if p_state='processed' and r.kind='customer' then update public.orders set payment_status='refunded' where id=r.order_id and paid_reference=r.payment_reference; end if;
end; $$;
create function public.set_fulfillment(p_order_id uuid,p_status text,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not private.can_manage('orders') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_status not in ('processing','shipped','delivered') or length(p_note)>1000 then raise exception 'Invalid delivery update'; end if;
 update public.orders set fulfillment_status=p_status,tracking_note=p_note where id=p_order_id and has_physical and payment_status='paid'
 and not exists(select 1 from public.refund_requests where order_id=p_order_id and kind='customer' and status in ('approved','processing','needs_review','refunded'));
 if not found then raise exception 'Only a paid physical order without an active approved refund can be updated'; end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'order.'||p_status,p_order_id);
end; $$;
revoke all on function public.save_product(uuid,jsonb,uuid),public.create_order(uuid,jsonb,text,uuid,jsonb),public.prepare_payment(uuid),public.request_refund(uuid,text),public.review_refund(uuid,text,text),public.set_fulfillment(uuid,text,text) from public,anon;
grant execute on function public.save_product(uuid,jsonb,uuid),public.create_order(uuid,jsonb,text,uuid,jsonb),public.prepare_payment(uuid),public.request_refund(uuid,text),public.review_refund(uuid,text,text),public.set_fulfillment(uuid,text,text) to authenticated;
revoke all on function public.claim_payment_initialization(text),public.record_payment(text,text,integer,text),public.claim_refund(uuid),public.record_refund(uuid,text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.claim_payment_initialization(text),public.record_payment(text,text,integer,text),public.claim_refund(uuid),public.record_refund(uuid,text,text,integer,text,text) to service_role;
commit;
