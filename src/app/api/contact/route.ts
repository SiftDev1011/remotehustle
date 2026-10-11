import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { validOrigin, jsonError } from "@/lib/api";
import { serviceDb } from "@/lib/supabase/admin";
import { requiredEnv } from "@/lib/env";
import { contactSchema } from "@/lib/contact";
import { verifyContactCaptcha } from "@/lib/captcha";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  try {
    if (!request.headers.get("content-type")?.includes("application/json"))
      return jsonError("Invalid request.", 415);
    // Limit actual bytes, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) return jsonError("Empty request.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 20000) {
        await reader.cancel();
        return jsonError("Message is too large.", 413);
      }
      chunks.push(value);
    }
    let body: unknown;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return jsonError("Invalid request body.");
    }
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success)
      return jsonError(
        "Check your name, email, subject, message and privacy acknowledgement.",
      );
    const data = parsed.data;
    if (data.website) return NextResponse.json({ success: true });
    if (!(await verifyContactCaptcha(data.captcha_token)))
      return jsonError(
        "Complete the security check. If it expired, please try again.",
        400,
      );
    const key = requiredEnv("CONTACT_RATE_SECRET");
    if (key.length < 32) throw new Error("Invalid rate secret");
    // Vercel overwrites this header. Other hosting environments use one shared network bucket.
    const ip =
      process.env.VERCEL === "1"
        ? request.headers
            .get("x-vercel-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "unknown"
        : "local";
    const hash = (v: string) =>
      createHmac("sha256", key).update(v).digest("hex");
    const { error } = await serviceDb().rpc("submit_contact", {
      p_name: data.name,
      p_email: data.email,
      p_subject: data.subject,
      p_message: data.message,
      p_fingerprints: [hash("email:" + data.email), hash("ip:" + ip)].sort(),
    });
    if (error) {
      if (error.message.includes("CONTACT_RATE_LIMIT"))
        return jsonError(
          "Too many messages. Please wait an hour or email us directly.",
          429,
        );
      throw error;
    }
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    console.error("[contact] Message could not be saved.");
    return jsonError(
      "Your message could not be sent. Please try again or email us directly.",
      503,
    );
  }
}
