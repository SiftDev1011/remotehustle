import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "./env";
export function jsonError(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    { status, headers: { "Cache-Control": "private, no-store" } },
  );
}
export function validOrigin(request: NextRequest) {
  try {
    return request.headers.get("origin") === appUrl();
  } catch {
    return false;
  } // Fail closed when the deployment origin is missing or invalid.
}
export async function apiIdentity() {
  const { getContext } = await import("./auth");
  const context = await getContext();
  if (
    !context ||
    !context.user.email_confirmed_at ||
    context.approval === "inactive"
  )
    return null;
  return context;
}
