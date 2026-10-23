import { HelpWidget } from "@/components/help-widget";
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
import "./skeletons.css";
import "./brand-theme.css";

export const metadata: Metadata = {
  applicationName: "REMOTE HUSTLE",
  icons: {
    icon: [{ url: "/brand-icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/brand-icon.png", sizes: "512x512" }],
  },
  robots: { index: indexingEnabled(), follow: true },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined },
  title: {
    default: "REMOTE HUSTLE | Work. Learn. Move forward.",
    template: "%s | REMOTE HUSTLE",
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
          <HelpWidget />
          <Suspense fallback={<FooterFallback />}>
            <SiteFooter />
          </Suspense>
        </div>
      </body>
    </html>
  );
}
