import { apiIdentity, jsonError } from "@/lib/api";
export async function GET() {
  try {
    const context = await apiIdentity();
    if (!context) return jsonError("Please sign in again.", 401);
    if (!context.membership?.active) return jsonError("Access denied.", 403);
    const { data, error } = await context.db.rpc("admin_attention");
    if (error) return jsonError("Unable to load notifications.", 503);
    return Response.json(
      { items: data || [] },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return jsonError("Unable to load notifications. Please try again.", 503);
  }
}
