import { createClient } from "@supabase/supabase-js";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes("@"))
    throw new Error(
      "Usage: npm run bootstrap-owner -- your-email@yourdomain.com",
    );
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key)
    throw new Error(
      "Set the Supabase URL and server-only service role key in .env.local.",
    );
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await db.rpc("bootstrap_workspace_owner", {
    p_email: email,
  });
  if (error) {
    if (error.message.includes("already exists"))
      throw new Error(
        "A workspace owner already exists. This one-time command will not create another.",
      );
    if (error.message.includes("verify"))
      throw new Error(
        "Register this account through the app and verify its email first.",
      );
    throw new Error(
      "Unable to bootstrap the owner. Check credentials and run all database migrations.",
    );
  }
  console.log("Workspace owner configured. Sign in and open /admin.");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
