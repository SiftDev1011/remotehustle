import "server-only";
import { serviceDb } from "@/lib/supabase/admin";
import { paymentGateway } from "./index";
import type { RefundResult } from "./types";
export async function reconcilePayment(reference: string) {
  if (!/^rh-[a-f0-9]{32}$/.test(reference))
    throw new Error("Invalid payment reference.");
  const db = serviceDb();
  const existing = await db
    .from("payment_attempts")
    .select("reference")
    .eq("reference", reference)
    .maybeSingle();
  if (existing.error) throw new Error("Unable to load payment.");
  if (!existing.data) return null;
  const verified = await paymentGateway().verify(reference);
  const result = await db.rpc("record_payment", {
    p_reference: verified.reference,
    p_state: verified.state,
    p_amount: verified.amountMinor,
    p_currency: verified.currency,
  });
  if (result.error)
    throw new Error("Payment verification did not match the order.");
  return { orderId: result.data as string, state: verified.state };
}
export async function saveRefundResult(id: string, result: RefundResult) {
  const { error } = await serviceDb().rpc("record_refund", {
    p_id: id,
    p_provider_id: result.id,
    p_reference: result.reference,
    p_amount: result.amountMinor,
    p_currency: result.currency,
    p_state: result.state,
  });
  if (error) throw new Error("Refund verification did not match the order.");
}
export async function reconcileKnownRefund(providerId: string) {
  if (!/^[0-9]+$/.test(providerId)) return;
  const db = serviceDb();
  const result = await paymentGateway().verifyRefund(providerId);
  const row = await db
    .from("refund_requests")
    .select("id")
    .eq("payment_reference", result.reference)
    .in("status", ["processing", "needs_review", "failed", "refunded"])
    .maybeSingle();
  if (row.error) throw new Error("Unable to load refund.");
  if (row.data) await saveRefundResult(row.data.id, result);
}
export async function reconcileRecentCommerce() {
  if (!process.env.PAYSTACK_SECRET_KEY) return { payments: 0, refunds: 0 };
  const db = serviceDb();
  let payments = 0,
    refunds = 0;
  const pending = await db
    .from("payment_attempts")
    .select("reference")
    .in("state", ["initializing", "pending"])
    .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
    .order("checked_at", { nullsFirst: true })
    .limit(5);
  for (const row of pending.data || [])
    try {
      await reconcilePayment(row.reference);
      payments++;
    } catch {
      await db
        .from("payment_attempts")
        .update({ checked_at: new Date().toISOString() })
        .eq("reference", row.reference);
    }
  const queued = await db
    .from("refund_requests")
    .select("provider_id")
    .eq("status", "processing")
    .not("provider_id", "is", null)
    .order("updated_at")
    .limit(5);
  for (const row of queued.data || [])
    try {
      await reconcileKnownRefund(row.provider_id);
      refunds++;
    } catch {
      /* Retry on next pass. */
    }
  return { payments, refunds };
}
