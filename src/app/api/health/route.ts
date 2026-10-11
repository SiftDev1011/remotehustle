import { NextResponse } from "next/server";
import { publicDb } from "@/lib/public-db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const { error } = await publicDb().from("jobs").select("id").limit(1);
    if (error) throw error;
    return NextResponse.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
