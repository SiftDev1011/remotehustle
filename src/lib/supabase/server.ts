import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requiredEnv } from "@/lib/env";

export async function serverDb() {
  const store = await cookies();
  return createServerClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(values) {
          try {
            for (const { name, value, options } of values)
              store.set(name, value, options);
          } catch {
            /* Server components cannot set cookies; proxy.ts handles refresh. */
          }
        },
      },
    },
  );
}
