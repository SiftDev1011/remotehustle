begin;
create table public.faqs (
 id uuid primary key default gen_random_uuid(),
 question text not null check(length(trim(question)) between 5 and 220),
 answer text not null check(length(trim(answer)) between 10 and 3000),
 sort_order integer not null default 0 check(sort_order between 0 and 10000),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.faqs enable row level security;
grant select on public.faqs to anon,authenticated;
grant insert,update,delete on public.faqs to authenticated;
grant all on public.faqs to service_role;
create policy faqs_public_read on public.faqs for select to anon,authenticated using(published or private.can_manage('content'));
create policy faqs_content_write on public.faqs for all to authenticated using(private.can_manage('content')) with check(private.can_manage('content'));
create index faqs_published_order on public.faqs(sort_order,id) where published;
insert into public.faqs(question,answer,sort_order,published) values
 ('How do I start using REMOTE HUSTLE?','Create an account, verify your email and complete your profile. The team must approve your account before you can apply for jobs or check out.',10,true),
 ('Why can’t I apply or check out yet?','You need a verified email, an approved account and a complete profile. Open your workspace to check your account status and see which profile details are still missing.',20,true),
 ('Where do I find training, internships and resources?','Use the homepage search to find jobs, training, internships and digital resources together. You can also browse Build skills for programmes and the shop for resources.',30,true),
 ('How do I download a purchased resource?','Once payment is confirmed, open Your orders in your workspace, select the order and use its Download button. The download email also links to your order. Sign in with the account used for the purchase.',40,true),
 ('What should I do if I have a purchase problem?','Open the order in your workspace and report a purchase issue. Explain the payment or download problem so the team can investigate. Check the published shop policy for the terms that apply to your purchase.',50,true),
 ('How do I register for REMOTE HUSTLE 1.0?','Sign in with a verified email, open the REMOTE HUSTLE 1.0 registration form and complete the required fields and agreements. You need an active access code from the organisers. Contact the team if you do not have a code.',60,true);
-- Counts only: no questions, answers, email addresses or raw network addresses.
create table private.helper_usage (bucket text primary key,attempts integer not null,expires_at timestamptz not null);
revoke all on private.helper_usage from public,anon,authenticated;
create function public.reserve_helper_request(p_fingerprint text,p_daily_limit integer default 100) returns text
language plpgsql security definer set search_path='' as $$
declare v_global text:='day:'||to_char(now() at time zone 'UTC','YYYY-MM-DD'); v_ip text:='ip:'||p_fingerprint; v_count integer;
begin
 if p_fingerprint is null or p_fingerprint !~ '^[a-f0-9]{64}$' or p_daily_limit is null or p_daily_limit not between 1 and 1000 then raise exception 'Invalid helper limit'; end if;
 perform pg_advisory_xact_lock(hashtextextended('remote-hustle-helper-budget',0));
 delete from private.helper_usage where expires_at<=now();
 select attempts into v_count from private.helper_usage where bucket=v_ip;
 if coalesce(v_count,0)>=20 then return 'rate'; end if;
 select attempts into v_count from private.helper_usage where bucket=v_global;
 if coalesce(v_count,0)>=p_daily_limit then return 'budget'; end if;
 insert into private.helper_usage(bucket,attempts,expires_at) values(v_ip,1,now()+interval '1 hour') on conflict(bucket) do update set attempts=helper_usage.attempts+1;
 insert into private.helper_usage(bucket,attempts,expires_at) values(v_global,1,((now() at time zone 'UTC')::date+1)::timestamp at time zone 'UTC') on conflict(bucket) do update set attempts=helper_usage.attempts+1;
 return 'allowed';
end; $$;
revoke all on function public.reserve_helper_request(text,integer) from public,anon,authenticated;
grant execute on function public.reserve_helper_request(text,integer) to service_role;
commit;
