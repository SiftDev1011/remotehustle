import "server-only";
import { appUrl } from "./env";
export function authCaptcha(form: FormData) {
  const token = String(form.get("captcha_token") || "");
  if (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    (!token || token.length > 2048)
  )
    throw new Error("Complete the security check and try again.");
  return token || undefined;
}
export async function verifyContactCaptcha(token: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret)
    return (
      process.env.NODE_ENV !== "production" &&
      !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    );
  if (!token || token.length > 2048) return false;
  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret, response: token }),
        signal: AbortSignal.timeout(8000),
      },
    );
    const result = await response.json();
    return (
      response.ok &&
      result.success === true &&
      result.hostname === new URL(appUrl()).hostname &&
      result.action === "contact"
    );
  } catch {
    return false;
  }
}
