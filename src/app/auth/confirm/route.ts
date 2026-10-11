import { NextResponse, type NextRequest } from "next/server";
import { serverDb } from "@/lib/supabase/server";
import { appUrl } from "@/lib/env";
import { safeNext } from "@/lib/domain";
import type { EmailOtpType } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const type = params.get("type");
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  let destination = safeNext(params.get("next"));
  try {
    const db = await serverDb();
    let error;
    if (
      tokenHash &&
      ["signup", "email", "recovery", "invite", "email_change"].includes(
        type || "",
      )
    ) {
      ({ error } = await db.auth.verifyOtp({
        token_hash: tokenHash,
        type: type as EmailOtpType,
      }));
      if (type === "recovery" || type === "invite")
        destination = "/reset-password";
    } else if (code) {
      ({ error } = await db.auth.exchangeCodeForSession(code));
    } else return NextResponse.redirect(appUrl() + "/auth/link-error");
    if (error) return NextResponse.redirect(appUrl() + "/auth/link-error");
    const response = NextResponse.redirect(appUrl() + destination);
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/auth/link-error", request.url));
  }
}
