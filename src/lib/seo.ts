import "server-only";
import type { Metadata } from "next";
import { cache } from "react";
import { idSchema } from "./validation";
import { publicDb } from "./public-db";
import { appUrl, supabaseConfigured } from "./env";
export function indexingEnabled() {
  return (
    process.env.SITE_INDEXING_ENABLED === "true" &&
    process.env.VERCEL_ENV !== "preview"
  );
}
export function publicMetadata(
  title: string,
  description: string,
  path: string,
): Metadata {
  const origin = appUrl();
  return {
    title,
    description,
    alternates: { canonical: new URL(path, origin).href },
    robots: { index: indexingEnabled(), follow: true },
    openGraph: {
      type: "website",
      siteName: "REMOTE HUSTLE",
      title,
      description,
      url: new URL(path, origin).href,
      images: [
        {
          url: new URL("/photos/about-workspace.jpg", origin).href,
          width: 1448,
          height: 1086,
          alt: "A prepared remote workspace",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/photos/about-workspace.jpg", origin).href],
    },
  };
}
export const publicJob = cache(async (id: string) => {
  if (!idSchema.safeParse(id).success || !supabaseConfigured()) return null;
  const { data, error } = await publicDb()
    .from("jobs")
    .select("id,title,company,description,updated_at")
    .eq("id", id)
    .eq("status", "published")
    .or("closes_at.is.null,closes_at.gt." + new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("Unable to load opportunity information.");
  return data;
});
export const publicProduct = cache(async (id: string) => {
  if (!idSchema.safeParse(id).success || !supabaseConfigured()) return null;
  const { data, error } = await publicDb()
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("active", true)
    .eq("type", "digital")
    .maybeSingle();
  if (error) throw new Error("Unable to load resource information.");
  return data as import("./commerce").Product | null;
});
