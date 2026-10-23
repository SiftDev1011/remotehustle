import sharp from "sharp";
import { publishedBranding } from "@/lib/branding";
import { brandLogoKey } from "@/lib/brand-settings";
import { brandImageBytes } from "@/lib/storage/assets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const { logoUrl } = await publishedBranding();
  const key = brandLogoKey(logoUrl, process.env.R2_PUBLIC_BASE_URL || "");
  let failed = false;
  let source: Buffer = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" rx="90" fill="#122d46"/><text x="256" y="320" text-anchor="middle" font-family="Arial,sans-serif" font-weight="bold" font-size="220" fill="#ffffff">RH</text></svg>',
  );
  if (key) {
    try {
      source = await brandImageBytes(key);
    } catch {
      failed = true;
    }
  }
  try {
    const png = await sharp(source, { limitInputPixels: 25000000 })
      .rotate()
      .resize(512, 512, {
        fit: "contain",
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": failed ? "no-store" : "public, max-age=300",
      },
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
