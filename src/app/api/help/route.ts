import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { validOrigin, jsonError } from "@/lib/api";
import { publishedFaqs } from "@/lib/faqs";
import {
  faqFallback,
  faqSources,
  relevantSources,
  type HelpSource,
} from "@/lib/help";
import { aiHelperEnabled, generateHelpAnswer } from "@/lib/ai-helper";
import { publicDb } from "@/lib/public-db";
import { serviceDb } from "@/lib/supabase/admin";
export const runtime = "nodejs";
export const maxDuration = 45;
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    return NextResponse.json(
      { faqs: await publishedFaqs(), ai: aiHelperEnabled() },
      { headers },
    );
  } catch {
    return jsonError(
      "Help is temporarily unavailable. You can still contact the team.",
      503,
    );
  }
}
export async function POST(request: NextRequest) {
  if (!validOrigin(request)) return jsonError("Unauthorised request.", 403);
  if (!request.headers.get("content-type")?.includes("application/json"))
    return jsonError("Send a valid question.", 415);
  try {
    const reader = request.body?.getReader();
    if (!reader) return jsonError("Enter a question.");
    const chunks: Uint8Array[] = [];
    let length = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 4096) {
        await reader.cancel();
        return jsonError("Keep your question under 600 characters.", 413);
      }
      chunks.push(value);
    }
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString());
    } catch {
      return jsonError("Send a valid question.");
    }
    const parsed = z
      .object({
        question: z.string().trim().min(3).max(600),
        aiConsent: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success)
      return jsonError("Enter a question between 3 and 600 characters.");
    const { question, aiConsent } = parsed.data;
    const faqs = await publishedFaqs();
    let sources = faqSources(faqs);
    const fallback = (notice?: string) =>
      NextResponse.json(faqFallback(question, sources, notice), { headers });
    if (!aiHelperEnabled() || !aiConsent) return fallback();
    // Reserve both network and site-wide quotas before any billable request.
    const ip =
      process.env.VERCEL === "1"
        ? request.headers
            .get("x-vercel-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "unknown"
        : "local";
    const fingerprint = createHmac("sha256", process.env.HELPER_RATE_SECRET!)
      .update(ip)
      .digest("hex");
    const configured = Number(process.env.AI_HELPER_DAILY_LIMIT || 100);
    const dailyLimit =
      Number.isInteger(configured) && configured >= 1 && configured <= 1000
        ? configured
        : 100;
    const quota = await serviceDb()
      .rpc("reserve_helper_request", {
        p_fingerprint: fingerprint,
        p_daily_limit: dailyLimit,
      })
      .abortSignal(AbortSignal.timeout(8000));
    if (quota.error)
      return fallback(
        "AI replies are temporarily unavailable. Here is help from the FAQs.",
      );
    if (quota.data !== "allowed")
      return fallback(
        "The AI request limit has been reached. You can still use the FAQs or contact the team.",
      );
    // Public client and explicit published checks; no session or service-role content reads.
    const content = await publicDb()
      .from("site_content")
      .select("key,value")
      .eq("published", true)
      .in("key", ["about", "commerce"]);
    if (content.error)
      return fallback(
        "AI replies are temporarily unavailable. Here is help from the FAQs.",
      );
    for (const row of content.data || []) {
      const fields =
        row.key === "about" ? ["title", "body"] : ["refund_policy"];
      const text = fields
        .map((k) => (typeof row.value?.[k] === "string" ? row.value[k] : ""))
        .join("\n")
        .trim();
      if (text)
        sources.push({
          id: row.key,
          title:
            row.key === "about"
              ? "About REMOTE HUSTLE"
              : "Purchase support and downloads",
          href: row.key === "about" ? "/about" : "/shop",
          text,
        });
    }
    sources.push({
      id: "navigation",
      title: "Find jobs, training, internships and resources",
      text: "Use /search to search all public jobs, training, internships and digital resources by keyword and career category. Browse /jobs for jobs, /programs for training and internships, /shop for digital products, /registration to register for REMOTE HUSTLE 1.0, /workspace/profile to complete your profile, and /workspace/orders for purchases. For account-specific help, contact the team through /about#contact. The helper cannot access accounts or make changes.",
      href: "/search",
    });
    const selected: HelpSource[] = relevantSources(question, sources);
    if (!selected.length) return fallback();
    try {
      const answer = await generateHelpAnswer(question, selected, {
        apiKey: process.env.OPENAI_API_KEY!,
        model: process.env.OPENAI_HELPER_MODEL!,
      });
      return answer ? NextResponse.json(answer, { headers }) : fallback();
    } catch {
      return fallback(
        "AI replies are temporarily unavailable. Here is help from the FAQs.",
      );
    }
  } catch {
    return jsonError(
      "Help could not load. Please try again or contact the team.",
      503,
    );
  }
}
