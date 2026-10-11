import { indexingEnabled } from "@/lib/seo";
import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AccountNavigation,
  SiteFooter,
  FooterFallback,
} from "@/components/site-shell";
import { Navigation } from "@/components/navigation";
import "./globals.css";
import "./app-shell.css";

export const metadata: Metadata = {
  robots: { index: indexingEnabled(), follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  title: {
    default: "Remote Hustle | Work. Learn. Move forward.",
    template: "%s | Remote Hustle",
  },
  description:
    "Remote jobs, practical training, internships and career resources. Providing opportunities for the best hands on deck.",
};
export const dynamic = "force-dynamic";
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/figtree-latin-400-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/cormorant-garamond-latin-300-normal.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <div id="rh-search-discovery">
          <a className="rh-a11y rh-skip" href="#rh-main">
            Skip to content
          </a>
          <Suspense fallback={<Navigation signedIn={false} isAdmin={false} />}>
            <AccountNavigation />
          </Suspense>
          {children}
          <Suspense fallback={<FooterFallback />}>
            <SiteFooter />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
