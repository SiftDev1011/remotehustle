import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { apiIdentity, validOrigin, jsonError } from "@/lib/api";
import { deliverOutbox } from "@/lib/email/outbox";
const checkoutItems = z
  .array(z.object({ id: z.uuid(), quantity: z.number().int().min(1).max(10) }))
  .min(1)
  .max(20);
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  const context = await apiIdentity();
  if (!context)
    return jsonError("Sign in with a verified account to continue.", 401);
  try {
    const body = z
      .object({
        requestKey: z.uuid(),
        items: checkoutItems,
        code: z.string().max(32),
        shippingId: z.null().optional(),
        address: z.null().optional(),
        consent: z.literal(true),
      })
      .parse(await request.json());
    const { data, error } = await context.db.rpc("create_order", {
      p_request_key: body.requestKey,
      p_items: body.items,
      p_code: body.code,
      p_shipping_id: null,
      p_address: null,
    });
    if (error)
      return jsonError(
        error.code === "P0001"
          ? /policy is published/.test(error.message)
            ? "Checkout is temporarily unavailable. Please try again later."
            : error.message
          : "Unable to create this order. Check your details and try again.",
      );
    after(async () => {
      try {
        await deliverOutbox();
      } catch {
        /* Cron retries. */
      }
    });
    return NextResponse.json(
      { id: data },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch {
    return jsonError("Check your cart and policy agreement.");
  }
}
