import { NextRequest, NextResponse } from "next/server";
import { apiIdentity, validOrigin, jsonError } from "@/lib/api";
import { idSchema } from "@/lib/validation";
import { serviceDb } from "@/lib/supabase/admin";
import { paymentGateway } from "@/lib/payments";
import { reconcilePayment } from "@/lib/payments/service";
import { appUrl } from "@/lib/env";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  const context = await apiIdentity();
  if (!context) return jsonError("Your session expired. Sign in again.", 401);
  if (!process.env.PAYSTACK_SECRET_KEY)
    return jsonError(
      "Payments are temporarily unavailable. Your order has been saved. Please try again shortly.",
      503,
    );
  try {
    const { orderId } = await request.json();
    if (!idSchema.safeParse(orderId).success)
      return jsonError("Invalid order.");
    const prepared = await context.db.rpc("prepare_payment", {
      p_order_id: orderId,
    });
    if (prepared.error)
      return jsonError(
        prepared.error.code === "P0001"
          ? prepared.error.message
          : "Unable to prepare payment.",
      );
    const reference = prepared.data as string,
      db = serviceDb();
    const attempt = await db
      .from("payment_attempts")
      .select("*")
      .eq("reference", reference)
      .single();
    const order = await context.db
      .from("orders")
      .select("receipt_email")
      .eq("id", orderId)
      .eq("user_id", context.user.id)
      .single();
    if (attempt.error || order.error) throw new Error();
    if (
      attempt.data.checkout_url &&
      ["initializing", "pending"].includes(attempt.data.state)
    )
      return NextResponse.json({ url: attempt.data.checkout_url });
    const claim = await db.rpc("claim_payment_initialization", {
      p_reference: reference,
    });
    if (claim.error) throw new Error();
    if (!claim.data)
      return jsonError(
        "This payment is being confirmed. Check its status shortly.",
        409,
      );
    try {
      const payment = await paymentGateway().initialise({
        reference,
        email: order.data.receipt_email,
        amountMinor: attempt.data.amount_minor,
        currency: attempt.data.currency,
        callbackUrl: appUrl() + "/api/payments/callback",
      });
      const save = await db
        .from("payment_attempts")
        .update({
          checkout_url: payment.checkoutUrl,
          state: "pending",
          lease_until: null,
        })
        .eq("reference", reference)
        .eq("state", "initializing");
      if (save.error) throw new Error();
      return NextResponse.json(
        { url: payment.checkoutUrl },
        { headers: { "Cache-Control": "private,no-store" } },
      );
    } catch {
      try {
        const result = await reconcilePayment(reference);
        if (result?.state === "success")
          return NextResponse.json({ paid: true });
      } catch {
        /* An unknown initialization retains its reference, avoiding a second possible charge. */
      }
      return jsonError(
        "Payment could not be opened. Check payment status, then retry. If money was debited, wait for confirmation.",
        503,
      );
    }
  } catch {
    return jsonError(
      "Unable to connect to payments. Your order is saved; please try again.",
      503,
    );
  }
}
