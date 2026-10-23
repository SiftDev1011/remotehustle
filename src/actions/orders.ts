"use server";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { requireArea, requireUser } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { serviceDb } from "@/lib/supabase/admin";
import { paymentGateway } from "@/lib/payments";
import { saveRefundResult, reconcilePayment } from "@/lib/payments/service";
import { deliverOutbox } from "@/lib/email/outbox";
import type { ActionState } from "@/lib/action-state";
function changed(id?: string) {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/purchase-issues");
  revalidatePath("/admin/attention");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/refunds");
  revalidatePath("/workspace/orders");
  if (id) {
    revalidatePath("/workspace/orders/" + id);
    revalidatePath("/admin/orders/" + id);
  }
}
export async function reportPurchaseIssueAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireUser("/workspace/orders");
  const id = String(form.get("order_id") || "");
  const category = String(form.get("category") || "");
  const message = String(form.get("message") || "").trim();
  if (
    !idSchema.safeParse(id).success ||
    !["download", "file", "payment", "other"].includes(category) ||
    message.length < 5 ||
    message.length > 2000
  )
    return {
      error:
        "Choose an issue type and describe the problem (5–2,000 characters).",
    };
  const result = await context.db.rpc("report_purchase_issue", {
    p_order_id: id,
    p_category: category,
    p_message: message,
  });
  if (result.error)
    return {
      error:
        result.error.code === "23505"
          ? "An issue is already open for this order."
          : ["P0001", "42501"].includes(result.error.code)
            ? result.error.message
            : "Unable to report this issue. Please try again.",
    };
  changed(id);
  return { success: "Issue sent. Check this order page for the team's reply." };
}
export async function reviewPurchaseIssueAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("orders");
  const id = String(form.get("id") || "");
  if (!idSchema.safeParse(id).success) return { error: "Invalid issue." };
  const result = await context.db.rpc("review_purchase_issue", {
    p_id: id,
    p_status: String(form.get("status") || ""),
    p_reply: String(form.get("reply") || "").trim(),
  });
  if (result.error)
    return {
      error:
        result.error.code === "23505"
          ? "Another issue is already open for this order."
          : result.error.code === "P0001"
            ? result.error.message
            : "Unable to update this issue.",
    };
  changed(result.data);
  return {
    success:
      "Issue updated. Your reply is visible on the customer's order page.",
  };
}
export async function reviewRefundAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("orders"),
    id = String(form.get("id"));
  if (!idSchema.safeParse(id).success) return { error: "Invalid refund." };
  const result = await context.db.rpc("review_refund", {
    p_id: id,
    p_decision: String(form.get("decision")),
    p_note: String(form.get("note") || ""),
  });
  if (result.error)
    return {
      error:
        result.error.code === "P0001"
          ? result.error.message
          : "Unable to update refund.",
    };
  changed();
  return {
    success:
      "Decision saved. Approved refunds must be submitted to the payment provider.",
  };
}
export async function processRefundAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("orders"),
    id = String(form.get("id"));
  if (!idSchema.safeParse(id).success || form.get("confirm") !== "on")
    return {
      error: "Confirm that this refund should be sent to the payment provider.",
    };
  if (!process.env.PAYSTACK_SECRET_KEY)
    return { error: "Payment provider configuration is missing." };
  const row = await context.db
    .from("refund_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (row.error) return { error: "Refund not found." };
  const db = serviceDb();
  const claim = await db.rpc("claim_refund", { p_id: id });
  if (claim.error || !claim.data)
    return {
      error: "This refund is already being processed or is not approved.",
    };
  try {
    const result = await paymentGateway().refund(
      row.data.payment_reference,
      row.data.amount_minor,
      "REMOTE HUSTLE refund " + id,
    );
    await saveRefundResult(id, result);
    changed(row.data.order_id);
    return {
      success:
        result.state === "processed"
          ? "Refund confirmed by the provider."
          : "Refund submitted. Funds are returned only when the provider confirms processing.",
    };
  } catch {
    // An uncertain response must never trigger a second refund POST. Reconcile the provider ID instead.
    await db
      .from("refund_requests")
      .update({ status: "needs_review", updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "processing");
    changed(row.data.order_id);
    return {
      error:
        "The provider result is uncertain. Check this transaction in Paystack and enter its refund ID below to reconcile it. Do not issue a second refund.",
    };
  }
}
export async function checkRefundAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("orders"),
    id = String(form.get("id"));
  if (!idSchema.safeParse(id).success) return { error: "Invalid refund." };
  const row = await context.db
    .from("refund_requests")
    .select("*")
    .eq("id", id)
    .single();
  if (row.error) return { error: "Refund not found." };
  const providerId =
    row.data.provider_id || String(form.get("provider_id") || "");
  if (!/^[0-9]+$/.test(providerId))
    return { error: "Enter the numeric refund ID from Paystack." };
  try {
    await saveRefundResult(id, await paymentGateway().verifyRefund(providerId));
    changed(row.data.order_id);
    return { success: "Refund status checked against the provider." };
  } catch {
    return {
      error:
        "Could not verify this refund. Check that the provider ID belongs to this transaction and amount.",
    };
  }
}
export async function setFulfillmentAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("orders"),
    id = String(form.get("id"));
  if (!idSchema.safeParse(id).success) return { error: "Invalid order." };
  const result = await context.db.rpc("set_fulfillment", {
    p_order_id: id,
    p_status: String(form.get("status")),
    p_note: String(form.get("tracking_note") || ""),
  });
  if (result.error)
    return {
      error:
        result.error.code === "P0001"
          ? result.error.message
          : "Unable to update delivery.",
    };
  changed(id);
  return { success: "Delivery stage saved." };
}
export async function adminCheckPaymentAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("orders"),
    reference = String(form.get("reference"));
  const row = await context.db
    .from("payment_attempts")
    .select("order_id")
    .eq("reference", reference)
    .single();
  if (row.error) return { error: "Payment not found." };
  try {
    await reconcilePayment(reference);
    changed(row.data.order_id);
    after(async () => {
      try {
        await deliverOutbox();
      } catch {
        /* Cron retries. */
      }
    });
    return { success: "Payment status checked." };
  } catch {
    return {
      error:
        "Unable to confirm payment. Check provider connectivity and the transaction reference.",
    };
  }
}
