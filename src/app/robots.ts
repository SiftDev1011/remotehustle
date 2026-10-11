import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";
import { indexingEnabled } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  if (!indexingEnabled()) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/workspace",
        "/api/",
        "/auth/",
        "/cart",
        "/sign-in",
        "/sign-up",
        "/verify-email",
        "/forgot-password",
        "/reset-password",
        "/access-denied",
        "/buy/",
      ],
    },
    sitemap: appUrl() + "/sitemap.xml",
  };
}
