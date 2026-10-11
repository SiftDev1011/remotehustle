begin;
-- Retain historical product/order/shipping records; only new purchases change.
create or replace function private.require_shop_policies() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.has_physical or new.shipping_minor<>0 or new.shipping_address is not null then raise exception 'The shop supports digital orders only'; end if;
 if not exists(select 1 from public.site_content where key='commerce' and published and length(trim(value->>'refund_policy'))>=20) then raise exception 'Checkout will open when the refund and download policy is published'; end if;
 return new;
end; $$;
create or replace function public.save_product(p_id uuid,p_data jsonb,p_asset uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not private.can_manage('shop') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_data->>'type' is distinct from 'digital' then raise exception 'The shop supports digital products only'; end if;
 if not exists(select 1 from public.media_assets where id=p_asset and area='shop' and kind='digital' and status='ready') then raise exception 'Upload a digital file before saving this product'; end if;
 if nullif(p_data->>'category_id','') is not null and not exists(select 1 from public.product_categories where id=(p_data->>'category_id')::uuid and active) then raise exception 'Choose an active product category'; end if;
 insert into public.products(id,name,description,type,price_minor,image_url,active,category_id) values(v_id,trim(p_data->>'name'),trim(p_data->>'description'),p_data->>'type',(p_data->>'price_minor')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,false),nullif(p_data->>'category_id','')::uuid)
 on conflict(id) do update set name=excluded.name,description=excluded.description,type=excluded.type,price_minor=excluded.price_minor,image_url=excluded.image_url,active=excluded.active,category_id=excluded.category_id;
 delete from public.product_files where product_id=v_id;
 if p_data->>'type'='digital' then insert into public.product_files(product_id,asset_id) values(v_id,p_asset); end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'product.save',v_id); return v_id;
end; $$;
create or replace function public.create_order(p_request_key uuid,p_items jsonb,p_code text default '',p_shipping_id uuid default null,p_address jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_item jsonb; v_product public.products; v_asset uuid; v_qty integer; v_sub bigint:=0; v_discount bigint:=0; v_code public.discounts; v_email text; begin
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
   if v_product.type<>'digital' then raise exception 'This shop sells digital products only. Remove the unavailable product from your cart'; end if;
   v_qty:=(v_item->>'quantity')::integer;
   if v_qty is null or v_qty not between 1 and 10 or (v_product.type='digital' and v_qty<>1) then raise exception 'Choose a valid quantity'; end if;
   if v_product.type='digital' and not exists(select 1 from public.product_files f join public.media_assets a on a.id=f.asset_id where f.product_id=v_product.id and a.status='ready') then raise exception 'A digital resource is unavailable'; end if;
   v_sub:=v_sub+v_product.price_minor::bigint*v_qty;
 end loop;
 if v_sub>100000000 then raise exception 'Order total is too large; please contact the team'; end if;
 if nullif(trim(p_code),'') is not null then
   select * into v_code from public.discounts where code=upper(trim(p_code)) and active and starts_at<=now() and (expires_at is null or expires_at>now()) for share;
   if not found or v_sub<v_code.minimum_minor then raise exception 'This discount code is invalid, expired or below its minimum spend'; end if;
   v_discount:=least(v_sub,case when v_code.type='fixed' then v_code.value else v_sub*v_code.value/100 end);
 end if;
 select email into v_email from public.profiles where user_id=auth.uid(); v_id:=gen_random_uuid();
 insert into public.orders(id,user_id,request_key,receipt_email,subtotal_minor,discount_minor,shipping_minor,total_minor,discount_code,shipping_name,shipping_address,has_physical)
 values(v_id,auth.uid(),p_request_key,v_email,v_sub,v_discount,0,v_sub-v_discount,v_code.code,null,null,false);
 for v_item in select * from jsonb_array_elements(p_items) loop
  select * into v_product from public.products where id=(v_item->>'id')::uuid;
  select asset_id into v_asset from public.product_files where product_id=v_product.id;
  insert into public.order_items(order_id,product_id,name,type,unit_minor,quantity,asset_id) values(v_id,v_product.id,v_product.name,v_product.type,v_product.price_minor,(v_item->>'quantity')::integer,case when v_product.type='digital' then v_asset end);
 end loop;
 -- Zero-total orders have no gateway transaction and cannot generate cash refunds.
 if v_sub-v_discount=0 then
  update public.orders set payment_status='paid',paid_at=now(),paid_reference='free-'||v_id where id=v_id;
  insert into public.email_outbox(recipient_id,kind,payload,dedupe_key) values(auth.uid(),'order-confirmation',jsonb_build_object('order_id',v_id,'reference',v_id),'order:'||v_id);
  if exists(select 1 from public.order_items where order_id=v_id and type='digital') then insert into public.email_outbox(recipient_id,kind,payload,dedupe_key) values(auth.uid(),'download-link',jsonb_build_object('order_id',v_id),'downloads:'||v_id); end if;
 end if;
 return v_id;
end; $$;
commit;
