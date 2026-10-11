-- Apply only to an isolated restored project after roles/schema/data have been restored.
-- Supabase CLI omits custom triggers on managed auth tables from the ordinary schema dump.
create or replace trigger remote_hustle_new_user after insert on auth.users for each row execute function private.handle_new_user();
create or replace trigger remote_hustle_sync_email after update of email on auth.users for each row execute function private.sync_email();
