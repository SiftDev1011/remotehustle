import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { apiIdentity, jsonError, validOrigin } from "@/lib/api";
import { idSchema } from "@/lib/validation";
import { validateAndStoreCv } from "@/lib/storage/r2";
import { serviceDb } from "@/lib/supabase/admin";
import { publicError } from "@/lib/errors";
import type { CvDocument } from "@/lib/domain";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  try {
    if (!validOrigin(request))
      return jsonError("Request origin rejected.", 403);
    const context = await apiIdentity();
    if (!context)
      return jsonError("Sign in with an active, verified account.", 401);
    if (Number(request.headers.get("content-length") || 0) > 4096)
      return jsonError("Request is too large.", 413);
    const body = (await request.json()) as { id: unknown };
    const id = idSchema.parse(body.id);
    const { data, error } = await context.db
      .from("cv_documents")
      .select("*")
      .eq("id", id)
      .eq("owner_id", context.user.id)
      .single();
    if (error || !data || data.status !== "pending")
      return jsonError("Upload expired or already completed.");
    // Validate service credentials before writing the final storage object.
    const admin = serviceDb();
    await validateAndStoreCv(data as CvDocument);
    const completed = await admin.rpc("finalize_cv_upload", {
      p_id: id,
      p_owner: context.user.id,
    });
    if (completed.error) return jsonError(publicError(completed.error));
    revalidatePath("/workspace");
    revalidatePath("/workspace/profile");
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return jsonError(publicError(error));
  }
}
