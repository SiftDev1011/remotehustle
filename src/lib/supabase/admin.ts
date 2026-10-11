import "server-only";
import { createClient } from "@supabase/supabase-js";
import { requiredEnv } from "@/lib/env";

// Privileged provider callbacks, verified uploads, invitations/deletion and background jobs use this client.
// All ordinary user/admin reads and mutations use the session client and database permissions.
export function serviceDb() {
  return createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
}
