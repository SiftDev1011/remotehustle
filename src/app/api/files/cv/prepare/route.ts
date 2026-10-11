import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { apiIdentity, jsonError, validOrigin } from "@/lib/api";
import { validateCvMetadata } from "@/lib/file-validation";
import { cvUploadUrl } from "@/lib/storage/r2";
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
    const input = z
      .object({
        name: z.string().max(180),
        type: z.string().max(150),
        size: z.number().int(),
      })
      .parse(await request.json());
    validateCvMetadata(input.name, input.type, input.size);
    // Validate configuration before creating a pending document row.
    if (
      !process.env.R2_PRIVATE_BUCKET ||
      !process.env.R2_ACCESS_KEY_ID ||
      !process.env.R2_SECRET_ACCESS_KEY ||
      !process.env.R2_ACCOUNT_ID
    )
      return jsonError(
        "CV uploads are temporarily unavailable. Please try again shortly.",
        503,
      );
    const record = await context.db.rpc("prepare_cv_upload", {
      p_name: input.name,
      p_type: input.type,
      p_size: input.size,
    });
    if (record.error) return jsonError(publicError(record.error));
    const { data, error } = await context.db
      .from("cv_documents")
      .select("*")
      .eq("id", record.data)
      .single();
    if (error || !data) return jsonError("Unable to prepare the upload.");
    const document = data as CvDocument;
    return NextResponse.json(
      {
        id: document.id,
        uploadUrl: await cvUploadUrl(document),
        contentType: document.mime_type,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return jsonError(publicError(error));
  }
}
