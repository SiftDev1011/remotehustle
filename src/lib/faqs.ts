import "server-only";
import { cache } from "react";
import { publicDb } from "./public-db";
import { supabaseConfigured } from "./env";
import type { Faq } from "./help";
export const publishedFaqs = cache(async function publishedFaqs(): Promise<
  Faq[]
> {
  if (!supabaseConfigured()) return [];
  const { data, error } = await publicDb()
    .from("faqs")
    .select("id,question,answer,sort_order")
    .eq("published", true)
    .order("sort_order")
    .order("id")
    .limit(200);
  if (error)
    throw new Error(
      "FAQs are temporarily unavailable. Please try again shortly.",
    );
  return data || [];
});
