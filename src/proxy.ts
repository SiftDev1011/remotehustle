import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (
    ["/api/health", "/api/contact", "/robots.txt", "/sitemap.xml"].includes(
      request.nextUrl.pathname,
    )
  )
    return response;
  // These public forms must remain reachable even when an old cookie cannot
  // refresh. Form POSTs and protected routes keep the usual refresh/checks.
  if (
    request.method === "GET" &&
    [
      "/sign-in",
      "/sign-up",
      "/forgot-password",
      "/verify-email",
      "/auth/link-error",
    ].includes(request.nextUrl.pathname)
  )
    return response;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
        response.headers.set("Cache-Control", "private, no-store");
      },
    },
  });
  await db.auth.getClaims();
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
