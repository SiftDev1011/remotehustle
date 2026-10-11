import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { apiIdentity, validOrigin, jsonError } from "@/lib/api";
import { canManage } from "@/lib/domain";
import { serviceDb } from "@/lib/supabase/admin";
import {
  assetExtension,
  assetUploadUrl,
  type Asset,
} from "@/lib/storage/assets";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  const context = await apiIdentity();
  if (!context)
    return jsonError("Your session expired. Please sign in again.", 401);
  try {
    if (Number(request.headers.get("content-length") || 0) > 4000)
      return jsonError("Upload metadata is too large.");
    const body = await request.json();
    const area = body.area as Asset["area"];
    if (
      !["partners", "content", "shop"].includes(area) ||
      !canManage(context.membership, area)
    )
      return jsonError("Access denied.", 403);
    if (
      !["image", "digital"].includes(body.kind) ||
      (body.kind === "digital" && area !== "shop")
    )
      return jsonError("Invalid upload purpose.");
    const ext = assetExtension(body.kind, body.mime, body.size);
    const name = String(body.name || "").slice(0, 180);
    if (
      !name ||
      !name
        .toLowerCase()
        .match(new RegExp("\\." + (ext === "jpg" ? "jpe?g" : ext) + "$"))
    )
      return jsonError("The filename and file type must match.");
    const db = serviceDb();
    const count = await db
      .from("media_assets")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", context.user.id)
      .gte("created_at", new Date(Date.now() - 86400000).toISOString());
    if (count.error) throw new Error();
    if ((count.count || 0) >= 60)
      return jsonError("Daily upload limit reached. Try again tomorrow.", 429);
    const id = randomUUID();
    const asset = {
      id,
      owner_id: context.user.id,
      area,
      kind: body.kind,
      original_name: name,
      mime_type: body.mime,
      size_bytes: body.size,
      staging_key: `asset-staging/${context.user.id}/${id}.${ext}`,
      object_key: `${body.kind === "image" ? "images" : "digital"}/${id}.${body.kind === "image" ? "webp" : ext}`,
      status: "pending",
      public_url: null,
      created_at: new Date().toISOString(),
    } as Asset;
    const url = await assetUploadUrl(asset);
    const insert = await db.from("media_assets").insert(asset);
    if (insert.error) throw new Error();
    return NextResponse.json(
      { id, url },
      { headers: { "Cache-Control": "private,no-store" } },
    );
  } catch (e) {
    return jsonError(
      e instanceof Error && /^(Choose|Public image)/.test(e.message)
        ? e.message
        : "Your upload could not start. Please try again shortly.",
      503,
    );
  }
}
