begin;
create function public.quote_discount(p_code text,p_subtotal integer) returns integer language plpgsql stable security definer set search_path='' as $$
declare d public.discounts; begin
 if p_subtotal not between 0 and 100000000 or length(p_code)>32 then raise exception 'Invalid subtotal'; end if;
 select * into d from public.discounts where code=upper(trim(p_code)) and active and starts_at<=now() and (expires_at is null or expires_at>now());
 if not found or p_subtotal<d.minimum_minor then raise exception 'Invalid discount'; end if;
 return least(p_subtotal,case when d.type='fixed' then d.value else (p_subtotal::bigint*d.value/100)::integer end);
end; $$;
revoke all on function public.quote_discount(text,integer) from public;
grant execute on function public.quote_discount(text,integer) to anon,authenticated;
create function private.require_shop_policies() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from public.site_content where key='commerce' and published and length(value->>'shipping_policy')>=20 and length(value->>'refund_policy')>=20) then raise exception 'Checkout will open when the shop policies are published'; end if;
 return new;
end; $$;
create trigger shop_policies_before_order before insert on public.orders for each row execute function private.require_shop_policies();
-- Finalization is a single writer: the same staging URL cannot race to replace a purchased file.
alter table public.media_assets drop constraint media_assets_status_check;
alter table public.media_assets add constraint media_assets_status_check check(status in ('pending','processing','ready'));
commit;
