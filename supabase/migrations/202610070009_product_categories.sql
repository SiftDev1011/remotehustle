begin;
create table public.product_categories(id uuid primary key default gen_random_uuid(),name text not null unique check(length(trim(name)) between 2 and 100),active boolean not null default true);
alter table public.product_categories enable row level security;
grant select on public.product_categories to anon,authenticated;
grant insert,update,delete on public.product_categories to authenticated;
grant all on public.product_categories to service_role;
create policy product_category_read on public.product_categories for select to anon,authenticated using(active or private.can_manage('shop'));
create policy product_category_write on public.product_categories for all to authenticated using(private.can_manage('shop')) with check(private.can_manage('shop'));
alter table public.products add column category_id uuid references public.product_categories(id) on delete set null;
alter table public.media_assets add column staging_removed_at timestamptz;
create or replace function public.save_product(p_id uuid,p_data jsonb,p_asset uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not private.can_manage('shop') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_data->>'type'='digital' and not exists(select 1 from public.media_assets where id=p_asset and area='shop' and kind='digital' and status='ready') then raise exception 'Upload a digital file before saving this product'; end if;
 if nullif(p_data->>'category_id','') is not null and not exists(select 1 from public.product_categories where id=(p_data->>'category_id')::uuid and active) then raise exception 'Choose an active product category'; end if;
 insert into public.products(id,name,description,type,price_minor,image_url,active,category_id) values(v_id,trim(p_data->>'name'),trim(p_data->>'description'),p_data->>'type',(p_data->>'price_minor')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,false),nullif(p_data->>'category_id','')::uuid)
 on conflict(id) do update set name=excluded.name,description=excluded.description,type=excluded.type,price_minor=excluded.price_minor,image_url=excluded.image_url,active=excluded.active,category_id=excluded.category_id;
 delete from public.product_files where product_id=v_id;
 if p_data->>'type'='digital' then insert into public.product_files(product_id,asset_id) values(v_id,p_asset); end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'product.save',v_id); return v_id;
end; $$;
commit;
