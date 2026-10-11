import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { applicationGate } from "@/lib/domain";
import { gateInput } from "@/components/profile-progress";
import { idSchema, httpsSchema } from "@/lib/validation";
import { appUrl } from "@/lib/env";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const id = (await params).id;
  if (!idSchema.safeParse(id).success)
    return new Response("Job not found.", { status: 404 });
  const context = await requireUser("/jobs/" + id);
  if (applicationGate(gateInput(context)) !== "ready")
    return NextResponse.redirect(appUrl() + "/jobs/" + id);
  const { data, error } = await context.db
    .from("job_application_links")
    .select("url")
    .eq("job_id", id)
    .maybeSingle();
  if (error || !data || !httpsSchema.safeParse(data.url).success)
    return new Response("Application link unavailable.", { status: 404 });
  const response = NextResponse.redirect(data.url);
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
