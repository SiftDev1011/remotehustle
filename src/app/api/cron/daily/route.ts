import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { serviceDb } from "@/lib/supabase/admin";
import { deliverOutbox } from "@/lib/email/outbox";
import { reconcileRecentCommerce } from "@/lib/payments/service";
import { removeAssetStage } from "@/lib/storage/assets";
import { deletePrivateObject } from "@/lib/storage/r2";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const supplied = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from("Bearer " + (secret || ""));
  if (
    !secret ||
    secret.length < 32 ||
    supplied.length !== expected.length ||
    !timingSafeEqual(supplied, expected)
  ) {
    return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  }
  try {
    const db = serviceDb();
    const started = await db
      .from("maintenance_health")
      .upsert({
        name: "daily",
        status: "running",
        started_at: new Date().toISOString(),
        finished_at: null,
      });
    if (started.error) throw new Error("Unable to record maintenance status.");
    // Real Postgres activity, not just an Auth endpoint ping. This is best-effort and not an uptime guarantee.
    const health = await db.from("worker_accounts").select("user_id").limit(1);
    if (health.error) throw new Error("Database unavailable.");
    await db
      .from("cv_documents")
      .delete()
      .eq("status", "pending")
      .lt("created_at", new Date(Date.now() - 86400000).toISOString());
    const commerce = await reconcileRecentCommerce();
    const emails = await deliverOutbox();
    let cleaned = 0;
    if (
      process.env.R2_PRIVATE_BUCKET &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
    ) {
      const stages = await db
        .from("media_assets")
        .select("id,staging_key,status")
        .is("staging_removed_at", null)
        .lt("created_at", new Date(Date.now() - 86400000).toISOString())
        .limit(40);
      for (const asset of stages.data || [])
        try {
          await removeAssetStage(asset.staging_key);
          if (asset.status === "pending")
            await db
              .from("media_assets")
              .delete()
              .eq("id", asset.id)
              .eq("status", "pending");
          else
            await db
              .from("media_assets")
              .update({ staging_removed_at: new Date().toISOString() })
              .eq("id", asset.id);
        } catch {
          /* Retry on next run. */
        }
      const queue = await db
        .from("storage_cleanup")
        .select("id,object_key")
        .order("created_at")
        .limit(40);
      for (const record of queue.data || []) {
        try {
          await deletePrivateObject(record.object_key);
          await db.from("storage_cleanup").delete().eq("id", record.id);
          cleaned++;
        } catch {
          /* Keep failed cleanup records for the next run. */
        }
      }
    }
    const finished = await db
      .from("maintenance_health")
      .update({ status: "ok", finished_at: new Date().toISOString() })
      .eq("name", "daily");
    if (finished.error)
      throw new Error("Unable to record maintenance completion.");
    return NextResponse.json(
      { database: "reachable", emails, cleaned, commerce },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    try {
      await serviceDb()
        .from("maintenance_health")
        .upsert({
          name: "daily",
          status: "failed",
          finished_at: new Date().toISOString(),
        });
    } catch {}
    return NextResponse.json(
      { error: "Scheduled maintenance failed. Check service configuration." },
      { status: 503 },
    );
  }
}
