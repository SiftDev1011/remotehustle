import { NextRequest, NextResponse, after } from "next/server";
import { validPaystackSignature } from "@/lib/payments/paystack";
import { reconcilePayment, reconcileKnownRefund } from "@/lib/payments/service";
import { deliverOutbox } from "@/lib/email/outbox";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY)
    return new NextResponse("Not configured", { status: 503 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 262144)
      return new NextResponse("Too large", { status: 413 });
    const reader = request.body?.getReader();
    if (!reader) return new NextResponse("Empty request", { status: 400 });
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 262144) {
        await reader.cancel();
        return new NextResponse("Too large", { status: 413 });
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks);
    if (
      !validPaystackSignature(
        raw,
        request.headers.get("x-paystack-signature") || "",
      )
    )
      return new NextResponse("Unauthorised", { status: 401 });
    const event = JSON.parse(raw.toString());
    if (
      event.event === "charge.success" &&
      typeof event.data?.reference === "string" &&
      /^rh-[a-f0-9]{32}$/.test(event.data.reference)
    )
      await reconcilePayment(event.data.reference);
    if (
      [
        "refund.processed",
        "refund.processing",
        "refund.pending",
        "refund.failed",
      ].includes(event.event) &&
      event.data?.id != null
    )
      await reconcileKnownRefund(String(event.data.id));
    after(async () => {
      try {
        await deliverOutbox();
      } catch {
        /* Cron retries. */
      }
    });
    return NextResponse.json({ received: true });
  } catch {
    return new NextResponse("Verification temporarily unavailable", {
      status: 503,
    });
  }
}
