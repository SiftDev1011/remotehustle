import { NextResponse } from "next/server";
import { apiIdentity, jsonError } from "@/lib/api";
import { serviceDb } from "@/lib/supabase/admin";
import { assetDownloadUrl, type Asset } from "@/lib/storage/assets";
import { idSchema } from "@/lib/validation";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await apiIdentity();
  if (!context) return jsonError("Sign in to download your purchase.", 401);
  const { id } = await params;
  if (!idSchema.safeParse(id).success)
    return jsonError("Download not found.", 404);
  const item = await context.db
    .from("order_items")
    .select("order_id,asset_id,type")
    .eq("id", id)
    .single();
  if (item.error || item.data.type !== "digital")
    return jsonError("Download not found.", 404);
  const order = await context.db
    .from("orders")
    .select("id")
    .eq("id", item.data.order_id)
    .eq("user_id", context.user.id)
    .eq("payment_status", "paid")
    .single();
  if (order.error)
    return jsonError("A confirmed, non-refunded purchase is required.", 403);
  const refund = await context.db
    .from("refund_requests")
    .select("id")
    .eq("order_id", item.data.order_id)
    .eq("kind", "customer")
    .in("status", ["approved", "processing", "needs_review", "refunded"])
    .limit(1);
  if (refund.error || refund.data.length)
    return jsonError(
      "Downloads are unavailable while your refund is being processed.",
      403,
    );
  try {
    const asset = await serviceDb()
      .from("media_assets")
      .select("*")
      .eq("id", item.data.asset_id)
      .eq("kind", "digital")
      .eq("status", "ready")
      .single();
    if (asset.error) throw new Error();
    const url = await assetDownloadUrl(asset.data as Asset);
    return new NextResponse(null, {
      status: 302,
      headers: {
        Location: url,
        "Cache-Control": "private,no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch {
    return jsonError(
      "Your download is temporarily unavailable. Try again shortly.",
      503,
    );
  }
}
