import { NextResponse } from "next/server";
import { apiIdentity, jsonError } from "@/lib/api";
import { idSchema } from "@/lib/validation";
import { cvDownloadUrl } from "@/lib/storage/r2";
import type { CvDocument } from "@/lib/domain";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await apiIdentity();
    if (!context) return jsonError("Your session expired. Sign in again.", 401);
    const parsed = idSchema.safeParse((await params).id);
    if (!parsed.success) return jsonError("Document not found.", 404);
    // RLS permits the owner, a users administrator, or a jobs administrator reviewing this CV's application.
    const { data, error } = await context.db
      .from("cv_documents")
      .select("*")
      .eq("id", parsed.data)
      .eq("status", "ready")
      .maybeSingle();
    if (error || !data) return jsonError("Document not found.", 404);
    const response = NextResponse.redirect(
      await cvDownloadUrl(data as CvDocument),
    );
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    return jsonError(
      "Unable to open this file. Check the storage connection.",
      503,
    );
  }
}
