import { z } from "zod";
export const SOCIAL_PLATFORMS = [
  { key: "instagram", label: "Instagram", hosts: ["instagram.com"] },
  { key: "facebook", label: "Facebook", hosts: ["facebook.com"] },
  { key: "x", label: "X", hosts: ["x.com", "twitter.com"] },
  { key: "linkedin", label: "LinkedIn", hosts: ["linkedin.com"] },
  { key: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { key: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { key: "whatsapp", label: "WhatsApp", hosts: ["wa.me", "whatsapp.com"] },
] as const;
export type SocialLink = { key: string; label: string; url: string };
export function socialUrl(key: string, value: string): string {
  if (!value.trim()) return "";
  const platform = SOCIAL_PLATFORMS.find((p) => p.key === key);
  const u = new URL(value.trim());
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.port ||
    !platform?.hosts.some(
      (h) => u.hostname === h || u.hostname.endsWith("." + h),
    )
  )
    throw new Error("Enter the official HTTPS link for this platform.");
  return u.href;
}
export const brandingSchema = z.object({
  logo_url: z.union([
    z.string().url().startsWith("https://").max(2000),
    z.literal(""),
  ]),
});
export function brandLogoKey(value: string, base: string): string | null {
  try {
    const u = new URL(value),
      b = new URL(base.endsWith("/") ? base : base + "/");
    if (
      u.protocol !== "https:" ||
      u.origin !== b.origin ||
      u.username ||
      u.password ||
      u.search ||
      u.hash ||
      !u.pathname.startsWith(b.pathname)
    )
      return null;
    const key = u.pathname.slice(b.pathname.length);
    return /^images\/[a-f0-9-]{36}\.webp$/.test(key) ? key : null;
  } catch {
    return null;
  }
}
