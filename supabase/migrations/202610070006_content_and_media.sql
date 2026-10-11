begin;
create table public.media_assets (
 id uuid primary key default gen_random_uuid(), owner_id uuid references auth.users(id) on delete set null,
 area public.admin_area not null check(area in ('partners','content','shop')), kind text not null check(kind in ('image','digital')),
 original_name text not null, mime_type text not null, size_bytes bigint not null check(size_bytes between 1 and 52428800),
 staging_key text not null unique, object_key text not null unique, public_url text check(public_url ~ '^https://'),
 status text not null default 'pending' check(status in ('pending','ready')), created_at timestamptz not null default now()
);
alter table public.media_assets enable row level security;
grant select on public.media_assets to authenticated;
grant all on public.media_assets to service_role;
create policy media_admin_read on public.media_assets for select to authenticated using(private.can_manage(area));
alter table public.programs add column image_url text check(image_url ~ '^https://'), add column starts_on date, add column duration text;
alter table public.partners add column sort_order integer not null default 0;
create table public.testimonials (
 id uuid primary key default gen_random_uuid(), quote text not null check(length(quote) between 10 and 2000),
 attribution text not null check(length(attribution) between 2 and 160), detail text not null default '',
 consent_confirmed boolean not null default false, published boolean not null default false,
 created_at timestamptz not null default now(), check(not published or consent_confirmed)
);
create table public.impact_metrics (
 id uuid primary key default gen_random_uuid(), label text not null check(length(label) between 2 and 120),
 value text not null check(length(value) between 1 and 40), evidence_note text not null check(length(evidence_note)>0),
 published boolean not null default false, created_at timestamptz not null default now()
);
alter table public.testimonials enable row level security;
alter table public.impact_metrics enable row level security;
grant select on public.testimonials to anon,authenticated;
grant select(id,label,value,published,created_at) on public.impact_metrics to anon;
grant select,insert,update,delete on public.testimonials,public.impact_metrics to authenticated;
grant all on public.testimonials,public.impact_metrics to service_role;
create policy testimonial_read on public.testimonials for select to anon,authenticated using(published or private.can_manage('content'));
create policy testimonial_write on public.testimonials for all to authenticated using(private.can_manage('content')) with check(private.can_manage('content'));
create policy metric_read on public.impact_metrics for select to anon,authenticated using(published or private.can_manage('content'));
create policy metric_write on public.impact_metrics for all to authenticated using(private.can_manage('content')) with check(private.can_manage('content'));
-- Metadata writes are service-only after a fresh scoped administrator check in the upload API.
-- Digital file object keys are never exposed through public content tables.
commit;
