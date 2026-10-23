import "server-only";
import { serviceDb } from "@/lib/supabase/admin";
import { appUrl, requiredEnv } from "@/lib/env";
import { renderEmail, type EmailKind } from "./templates";

interface OutboxRecord {
  id: string;
  recipient_id: string;
  kind: EmailKind;
  payload: Record<string, unknown>;
  attempts: number;
}
export async function deliverOutbox() {
  if (
    !process.env.BREVO_API_KEY ||
    !process.env.EMAIL_FROM_ADDRESS ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return { configured: false, sent: 0, retried: 0 };
  const db = serviceDb();
  const { data, error } = await db.rpc("claim_email_outbox", { p_limit: 10 });
  if (error) throw new Error("Unable to claim pending email messages.");
  let sent = 0,
    retried = 0;
  for (const record of (data || []) as OutboxRecord[]) {
    try {
      const recipient = await db
        .from("profiles")
        .select("email,full_name")
        .eq("user_id", record.recipient_id)
        .single();
      if (recipient.error || !recipient.data)
        throw new Error("Recipient unavailable.");
      const content = renderEmail(
        record.kind,
        recipient.data.full_name,
        record.payload,
        appUrl(),
      );
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": requiredEnv("BREVO_API_KEY"),
          "Content-Type": "application/json",
          accept: "application/json",
        },
        body: JSON.stringify({
          sender: {
            email: requiredEnv("EMAIL_FROM_ADDRESS"),
            name: process.env.EMAIL_FROM_NAME || "REMOTE HUSTLE",
          },
          to: [{ email: recipient.data.email, name: recipient.data.full_name }],
          subject: content.subject,
          htmlContent: content.html,
          textContent: content.text,
          tags: [record.kind],
          headers: { idempotencyKey: record.id },
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok)
        throw new Error("Email provider did not accept the request.");
      const body = (await response.json()) as { messageId?: string };
      const saved = await db
        .from("email_outbox")
        .update({
          status: "sent",
          provider_message_id: body.messageId || null,
          lease_until: null,
          last_error: null,
        })
        .eq("id", record.id);
      if (saved.error)
        throw new Error("Email delivery record could not be saved.");
      sent++;
    } catch {
      const final = record.attempts >= 8;
      const next = new Date(
        Date.now() + Math.min(360, 2 ** record.attempts) * 60000,
      ).toISOString();
      await db
        .from("email_outbox")
        .update({
          status: final ? "failed" : "queued",
          next_attempt_at: next,
          lease_until: null,
          last_error:
            "Delivery failed. Check sender verification, provider limits and connectivity.",
        })
        .eq("id", record.id);
      retried++;
    }
  }
  return { configured: true, sent, retried };
}
