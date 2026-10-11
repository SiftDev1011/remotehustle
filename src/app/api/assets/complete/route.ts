import { NextRequest, NextResponse } from "next/server";
import { apiIdentity, validOrigin, jsonError } from "@/lib/api";
import { canManage } from "@/lib/domain";
import { serviceDb } from "@/lib/supabase/admin";
import {
  completeAsset,
  removeAssetStage,
  type Asset,
} from "@/lib/storage/assets";
import { idSchema } from "@/lib/validation";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  const context = await apiIdentity();
  if (!context)
    return jsonError("Your session expired. Please sign in again.", 401);
  try {
    const body = await request.json();
    if (!idSchema.safeParse(body.id).success)
      return jsonError("Invalid file identifier.");
    const db = serviceDb();
    const result = await db
      .from("media_assets")
      .select("*")
      .eq("id", body.id)
      .eq("owner_id", context.user.id)
      .single();
    const asset = result.data as Asset | null;
    if (result.error || !asset || !canManage(context.membership, asset.area))
      return jsonError("File not found.", 404);
    if (asset.status === "ready")
      return NextResponse.json({ id: asset.id, url: asset.public_url });
    if (Date.parse(asset.created_at) < Date.now() - 1800000)
      return jsonError("This upload expired. Upload it again.");
    const claim = await db
      .from("media_assets")
      .update({ status: "processing" })
      .eq("id", asset.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (claim.error || !claim.data)
      return jsonError(
        "This file is already being verified. If verification failed, upload it again.",
        409,
      );
    const url = await completeAsset(asset);
    const saved = await db
      .from("media_assets")
      .update({ status: "ready", public_url: url })
      .eq("id", asset.id)
      .eq("status", "processing");
    if (saved.error) throw new Error();
    try {
      await removeAssetStage(asset.staging_key);
      await db
        .from("media_assets")
        .update({ staging_removed_at: new Date().toISOString() })
        .eq("id", asset.id);
    } catch {
      /* The daily cleanup retries staging removal. */
    }
    return NextResponse.json(
      { id: asset.id, url },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return jsonError(
      e instanceof Error && /^(Upload|The file|Choose)/.test(e.message)
        ? e.message
        : "Unable to verify this file. Please upload it again.",
    );
  }
}
