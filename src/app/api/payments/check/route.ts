import { NextRequest, NextResponse, after } from "next/server";
import { apiIdentity, validOrigin, jsonError } from "@/lib/api";
import { idSchema } from "@/lib/validation";
import { reconcilePayment } from "@/lib/payments/service";
import { deliverOutbox } from "@/lib/email/outbox";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  const context = await apiIdentity();
  if (!context) return jsonError("Your session expired. Sign in again.", 401);
  try {
    const { orderId } = await request.json();
    if (!idSchema.safeParse(orderId).success)
      return jsonError("Invalid order.");
    const order = await context.db
      .from("orders")
      .select("id,payment_status")
      .eq("id", orderId)
      .eq("user_id", context.user.id)
      .single();
    if (order.error) return jsonError("Order not found.", 404);
    const attempts = await context.db
      .from("payment_attempts")
      .select("reference")
      .eq("order_id", orderId)
      .in("state", ["initializing", "pending", "failed"])
      .order("created_at", { ascending: false })
      .limit(3);
    if (attempts.error) throw new Error();
    if (!attempts.data.length)
      return NextResponse.json({
        state: order.data.payment_status === "paid" ? "success" : "pending",
      });
    let state = "pending";
    for (const attempt of attempts.data) {
      const result = await reconcilePayment(attempt.reference);
      if (result?.state === "success") {
        state = "success";
        break;
      }
      if (result) state = result.state;
    }
    after(async () => {
      try {
        await deliverOutbox();
      } catch {
        /* Cron retries. */
      }
    });
    return NextResponse.json(
      { state },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch {
    return jsonError(
      "Confirmation is temporarily unavailable. Your order is saved; check again shortly.",
      503,
    );
  }
}
