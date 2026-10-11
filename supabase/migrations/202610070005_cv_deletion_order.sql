begin;
-- Auth deletion cascades through both profiles and CVs. Check the CV snapshot
-- reference after all cascades finish, while still protecting a referenced CV
-- from being removed on its own.
alter table public.applications alter constraint applications_cv_id_fkey
  deferrable initially deferred;
commit;
