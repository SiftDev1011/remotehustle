import "server-only";
import { cache } from "react";
import { publicDb } from "./public-db";
import {
  brandLogoKey,
  SOCIAL_PLATFORMS,
  socialUrl,
  type SocialLink,
} from "./brand-settings";
export const publishedBranding = cache(async function () {
  const fallback = { logoUrl: "", socials: [] as SocialLink[] };
  try {
    const { data, error } = await publicDb()
      .from("site_content")
      .select("key,value")
      .in("key", ["branding", "socials"])
      .eq("published", true);
    if (error) return fallback;
    const raw = data?.find((x) => x.key === "branding")?.value?.logo_url;
    const values = data?.find((x) => x.key === "socials")?.value || {};
    const socials: SocialLink[] = [];
    for (const p of SOCIAL_PLATFORMS) {
      try {
        const url = socialUrl(p.key, String(values[p.key] || ""));
        if (url) socials.push({ key: p.key, label: p.label, url });
      } catch {
        /* Omit invalid legacy links. */
      }
    }
    return {
      logoUrl:
        typeof raw === "string" &&
        brandLogoKey(raw, process.env.R2_PUBLIC_BASE_URL || "")
          ? raw
          : "",
      socials,
    };
  } catch {
    return fallback;
  }
});
