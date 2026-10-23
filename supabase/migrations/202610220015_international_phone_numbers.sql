begin;
-- Some countries have shorter national numbers (for example Niue, +683).
-- Existing numbers stay unchanged. Server-side forms also use numbering-plan metadata.
alter table public.profiles drop constraint profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check
 check(phone is null or phone ~ '^\+[1-9][0-9]{4,14}$') not valid;
alter table public.profiles validate constraint profiles_phone_check;
create or replace function private.canonical_phone(p_phone text) returns text
language plpgsql immutable set search_path='' as $$
declare v text := regexp_replace(coalesce(p_phone,''),'[\s().-]','','g');
begin
 if v='' then return null; end if;
 if v ~ '^0[789][0-9]{9}$' then v:='+234'||substring(v from 2);
 elsif v ~ '^234[789][0-9]{9}$' then v:='+'||v; end if;
 if v !~ '^\+[1-9][0-9]{4,14}$' then raise exception 'Invalid phone number' using errcode='22023'; end if;
 return v;
end $$;
commit;
