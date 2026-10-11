import type { MetadataRoute } from "next";
import { appUrl, supabaseConfigured } from "@/lib/env";
import { publicDb } from "@/lib/public-db";
import { indexingEnabled } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!indexingEnabled()) return [];
  const origin = appUrl();
  const urls: MetadataRoute.Sitemap = [
    "/",
    "/jobs",
    "/programs",
    "/shop",
    "/about",
    "/privacy",
    "/terms",
  ].map((path) => ({ url: origin + path }));
  if (!supabaseConfigured())
    throw new Error("Database configuration is required for the sitemap.");
  const db = publicDb();
  for (const table of ["jobs", "products"] as const) {
    for (let offset = 0; ; offset += 1000) {
      let request = db
        .from(table)
        .select(table === "jobs" ? "id,updated_at" : "id")
        .order("id")
        .range(offset, offset + 999);
      if (table === "jobs")
        request = request
          .eq("status", "published")
          .or("closes_at.is.null,closes_at.gt." + new Date().toISOString());
      else request = request.eq("active", true).eq("type", "digital");
      const { data, error } = await request;
      if (error) throw new Error("Unable to generate sitemap.");
      for (const row of (data || []) as unknown as {
        id: string;
        updated_at?: string;
      }[])
        urls.push({
          url: origin + (table === "jobs" ? "/jobs/" : "/shop/") + row.id,
          ...(row.updated_at ? { lastModified: row.updated_at } : {}),
        });
      if (urls.length > 45000)
        throw new Error(
          "Split the sitemap before publishing more than 45,000 URLs.",
        );
      if (!data || data.length < 1000) break;
    }
  }
  return urls;
}
