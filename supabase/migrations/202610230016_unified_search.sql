begin;
alter table public.programs add column career_category_id uuid references public.job_categories(id) on delete set null;
alter table public.products add column career_category_id uuid references public.job_categories(id) on delete set null;
alter table public.programs add column search_document tsvector generated always as (to_tsvector('english',title || ' ' || description)) stored;
alter table public.products add column search_document tsvector generated always as (to_tsvector('english',name || ' ' || description)) stored;
create index programs_search_idx on public.programs using gin(search_document);
create index products_search_idx on public.products using gin(search_document);
create index programs_career_category_idx on public.programs(career_category_id);
create index products_career_category_idx on public.products(career_category_id);
-- Managers can see previously assigned inactive categories, but cannot change taxonomy.
create policy career_categories_managers_read on public.job_categories for select to authenticated
 using (private.can_manage('content') or private.can_manage('shop'));
create function private.check_career_category() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' and new.career_category_id is not distinct from old.career_category_id then return new; end if;
 if new.career_category_id is not null and not exists(select 1 from public.job_categories where id=new.career_category_id and active) then
  raise exception 'Choose an active career category';
 end if;
 return new;
end; $$;
create trigger programs_career_category before insert or update on public.programs for each row execute function private.check_career_category();
create trigger products_career_category before insert or update on public.products for each row execute function private.check_career_category();
create or replace function public.save_product(p_id uuid,p_data jsonb,p_asset uuid default null) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid:=coalesce(p_id,gen_random_uuid()); begin
 if not private.can_manage('shop') then raise exception 'Access denied' using errcode='42501'; end if;
 if p_data->>'type' is distinct from 'digital' then raise exception 'The shop supports digital products only'; end if;
 if not exists(select 1 from public.media_assets where id=p_asset and area='shop' and kind='digital' and status='ready') then raise exception 'Upload a digital file before saving this product'; end if;
 if nullif(p_data->>'category_id','') is not null and not exists(select 1 from public.product_categories where id=(p_data->>'category_id')::uuid and active) then raise exception 'Choose an active product category'; end if;
 insert into public.products(id,name,description,type,price_minor,image_url,active,category_id,career_category_id) values(v_id,trim(p_data->>'name'),trim(p_data->>'description'),p_data->>'type',(p_data->>'price_minor')::integer,nullif(p_data->>'image_url',''),coalesce((p_data->>'active')::boolean,false),nullif(p_data->>'category_id','')::uuid,nullif(p_data->>'career_category_id','')::uuid)
 on conflict(id) do update set name=excluded.name,description=excluded.description,type=excluded.type,price_minor=excluded.price_minor,image_url=excluded.image_url,active=excluded.active,category_id=excluded.category_id,career_category_id=excluded.career_category_id;
 delete from public.product_files where product_id=v_id;
 if p_data->>'type'='digital' then insert into public.product_files(product_id,asset_id) values(v_id,p_asset); end if;
 insert into public.audit_log(actor_id,action,entity_id) values(auth.uid(),'product.save',v_id); return v_id;
end; $$;

-- Invoker security retains RLS. Explicit publication checks also apply to admins.
-- Only public listing fields are returned; digital files and application links are excluded.
create function public.search_catalog(p_kind text,p_query text default '',p_category uuid default null,p_location uuid default null,p_page integer default 0)
returns jsonb language sql stable security invoker set search_path='' as $$
 with settings as (
  select websearch_to_tsquery('english',left(trim(coalesce(p_query,'')),150)) as term,
    trim(coalesce(p_query,''))='' as blank,
    greatest(0,least(coalesce(p_page,0),10000))*6 as skip
 ), matching_categories as (
  select id from public.job_categories,settings where active and to_tsvector('english',name) @@ term
 ), matching_product_categories as (
  select id from public.product_categories,settings where active and to_tsvector('english',name) @@ term
 ), matches as (
  select j.id,j.created_at,ts_rank(j.search_document,s.term) as rank,
    to_jsonb(j)-'search_document'-'created_by'-'application_url' as record
  from public.jobs j cross join settings s
  where p_kind='jobs' and j.status='published' and (j.closes_at is null or j.closes_at>now())
   and (p_category is null or j.category_id=p_category) and (p_location is null or j.location_id=p_location)
   and (s.blank or j.search_document @@ s.term or j.category_id in(select id from matching_categories))
  union all
  select p.id,p.created_at,ts_rank(p.search_document,s.term),to_jsonb(p)-'search_document'
  from public.programs p cross join settings s
  where p_kind=p.type and p.published and (p_category is null or p.career_category_id=p_category)
   and (s.blank or p.search_document @@ s.term or p.career_category_id in(select id from matching_categories))
  union all
  select p.id,p.created_at,ts_rank(p.search_document,s.term),to_jsonb(p)-'search_document'
  from public.products p cross join settings s
  where p_kind='resources' and p.active and p.type='digital' and (p_category is null or p.career_category_id=p_category)
   and (s.blank or p.search_document @@ s.term or p.career_category_id in(select id from matching_categories)
    or p.category_id in(select id from matching_product_categories))
 ), page as (
  select * from matches order by rank desc,created_at desc,id limit 6 offset(select skip from settings)
 )
 select jsonb_build_object('total',(select count(*) from matches),
  'items',coalesce((select jsonb_agg(record order by rank desc,created_at desc,id) from page),'[]'::jsonb));
$$;
revoke all on function public.search_catalog(text,text,uuid,uuid,integer) from public;
grant execute on function public.search_catalog(text,text,uuid,uuid,integer) to anon,authenticated;
commit;
