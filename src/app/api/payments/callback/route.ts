import { NextRequest, NextResponse, after } from "next/server";
import { reconcilePayment } from "@/lib/payments/service";
import { deliverOutbox } from "@/lib/email/outbox";
import { appUrl } from "@/lib/env";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  if (!process.env.APP_URL)
    return NextResponse.json(
      {
        error:
          "Payment confirmation is temporarily unavailable. Please check your order again shortly.",
      },
      { status: 503 },
    );
  const reference =
    request.nextUrl.searchParams.get("reference") ||
    request.nextUrl.searchParams.get("trxref") ||
    "";
  try {
    const result = await reconcilePayment(reference);
    after(async () => {
      try {
        await deliverOutbox();
      } catch {
        /* Cron retries. */
      }
    });
    return NextResponse.redirect(
      new URL(
        result ? "/workspace/orders/" + result.orderId : "/_not-found",
        appUrl(),
      ),
    );
  } catch {
    return NextResponse.redirect(
      new URL("/workspace/orders?confirmation=pending", appUrl()),
    );
  }
}
