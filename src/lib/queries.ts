import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { serverDb } from "./supabase/server";
import { supabaseConfigured } from "./env";
import type { Job, ListItem } from "./domain";

// Only published contact data is needed by the footer. Use an anonymous client
// so expired session refreshes and unrelated content tables cannot block it.
export const publishedContact = cache(async function publishedContact() {
  if (!supabaseConfigured()) return {} as Record<string, string>;
  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    },
  );
  const { data, error } = await db
    .from("site_content")
    .select("value")
    .eq("key", "contact")
    .eq("published", true)
    .abortSignal(AbortSignal.timeout(8000))
    .maybeSingle();
  if (error) throw new Error("Unable to load contact details.");
  const contact: Record<string, string> = {};
  if (data?.value && typeof data.value === "object") {
    for (const key of ["email", "phone", "address"]) {
      if (typeof data.value[key] === "string") contact[key] = data.value[key];
    }
  }
  return contact;
});

export async function lists() {
  if (!supabaseConfigured())
    return {
      categories: [] as ListItem[],
      skills: [] as ListItem[],
      locations: [] as ListItem[],
    };
  const db = await serverDb();
  const result = await Promise.all(
    ["job_categories", "skills", "locations"].map((table) =>
      db.from(table).select("*").eq("active", true).order("name"),
    ),
  );
  if (result.some((r) => r.error))
    throw new Error(
      "Unable to load profile lists. Run the database migration.",
    );
  return {
    categories: result[0].data as ListItem[],
    skills: result[1].data as ListItem[],
    locations: result[2].data as ListItem[],
  };
}
export async function publishedJobs(
  filters: {
    q?: string;
    category?: string;
    location?: string;
    employment?: string;
  } = {},
  limit = 60,
) {
  if (!supabaseConfigured()) return [] as Job[];
  const db = await serverDb();
  let query = db
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (filters.q?.trim())
    query = query.textSearch(
      "search_document",
      filters.q.trim().slice(0, 150),
      { type: "websearch", config: "english" },
    );
  if (filters.category) query = query.eq("category_id", filters.category);
  if (filters.location) query = query.eq("location_id", filters.location);
  if (filters.employment)
    query = query.eq("employment_type", filters.employment);
  const { data, error } = await query;
  if (error) throw new Error("Unable to load job opportunities.");
  return data as Job[];
}
export async function homepageRecords(programLimit = 3) {
  if (!supabaseConfigured()) return { partners: [], programs: [] };
  const db = await serverDb();
  const [partners, programs] = await Promise.all([
    db
      .from("partners")
      .select("id,name,logo_url,website_url")
      .eq("active", true)
      .order("sort_order")
      .order("created_at"),
    db
      .from("programs")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(programLimit),
  ]);
  if (partners.error || programs.error)
    throw new Error("Unable to load website content.");
  return { partners: partners.data || [], programs: programs.data || [] };
}

export const websiteContent = cache(async function websiteContent() {
  if (!supabaseConfigured())
    return {
      content: {} as Record<string, Record<string, string>>,
      testimonials: [] as {
        id: string;
        quote: string;
        attribution: string;
        detail: string;
      }[],
      metrics: [] as { id: string; label: string; value: string }[],
    };
  const db = await serverDb();
  const [content, testimonials, metrics] = await Promise.all([
    db.from("site_content").select("key,value").eq("published", true),
    db
      .from("testimonials")
      .select("id,quote,attribution,detail")
      .eq("published", true)
      .order("created_at")
      .limit(12),
    db
      .from("impact_metrics")
      .select("id,label,value")
      .eq("published", true)
      .limit(8),
  ]);
  if (content.error || testimonials.error || metrics.error)
    throw new Error("Unable to load published content.");
  const values: Record<string, Record<string, string>> = {};
  for (const row of content.data || []) {
    values[row.key] = {};
    if (row.value && typeof row.value === "object")
      for (const [key, value] of Object.entries(row.value))
        if (typeof value === "string") values[row.key][key] = value;
  }
  return {
    content: values,
    testimonials: testimonials.data || [],
    metrics: metrics.data || [],
  };
});
export async function shopRecords() {
  if (!supabaseConfigured())
    return {
      products: [] as import("./commerce").Product[],
      categories: [] as { id: string; name: string }[],
    };
  const db = await serverDb();
  const [products, categories] = await Promise.all([
    db
      .from("products")
      .select("*")
      .eq("active", true)
      .eq("type", "digital")
      .order("created_at", { ascending: false }),
    db
      .from("product_categories")
      .select("id,name")
      .eq("active", true)
      .order("name"),
  ]);
  if (products.error || categories.error)
    throw new Error("Unable to load the shop.");
  return {
    products: products.data as import("./commerce").Product[],
    categories: categories.data || [],
  };
}
