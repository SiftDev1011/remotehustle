import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOrigin, jsonError } from "@/lib/api";
import { serverDb } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  if (!supabaseConfigured())
    return jsonError(
      "The shop is temporarily unavailable. Please try again shortly.",
      503,
    );
  try {
    const body = z
      .object({
        code: z.string().trim().min(3).max(32),
        items: z
          .array(
            z.object({
              id: z.uuid(),
              quantity: z.number().int().min(1).max(10),
            }),
          )
          .min(1)
          .max(20),
      })
      .parse(await request.json());
    const db = await serverDb();
    const result = await db
      .from("products")
      .select("id,price_minor,type")
      .eq("active", true)
      .eq("type", "digital")
      .in(
        "id",
        body.items.map((x) => x.id),
      );
    if (result.error || result.data.length !== body.items.length)
      return jsonError("A product in your cart is unavailable.");
    let subtotal = 0;
    for (const item of body.items) {
      const p = result.data.find((p) => p.id === item.id)!;
      if (p.type === "digital" && item.quantity !== 1)
        return jsonError("Digital products have a quantity of one.");
      subtotal += p.price_minor * item.quantity;
    }
    const { data, error } = await db.rpc("quote_discount", {
      p_code: body.code,
      p_subtotal: subtotal,
    });
    if (error)
      return jsonError(
        "This code is invalid, expired or below its minimum spend.",
      );
    return NextResponse.json(
      { discount: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return jsonError("Enter a valid discount code.");
  }
}
