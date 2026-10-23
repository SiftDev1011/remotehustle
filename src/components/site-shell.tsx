import { Brand } from "./brand";
import { SocialLinks } from "./social-links";
import { publishedBranding } from "@/lib/branding";
import type { SocialLink } from "@/lib/brand-settings";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/site-details";
import { Navigation } from "./navigation";
import { RefreshButton } from "./refresh-button";
import { getContext } from "@/lib/auth";
import { publishedContact } from "@/lib/queries";

// Optional shell data must never decide access or prevent a page from rendering.
// Protected pages and actions still perform their own fresh permission checks.
export async function AccountNavigation() {
  const branding = await publishedBranding();
  try {
    const context = await getContext();
    return (
      <Navigation
        logoUrl={branding.logoUrl}
        signedIn={!!context}
        isAdmin={!!context?.membership?.active}
      />
    );
  } catch {
    console.error("[site-shell] Account navigation temporarily unavailable.");
    return (
      <>
        <Navigation
          signedIn={false}
          isAdmin={false}
          logoUrl={branding.logoUrl}
        />
        <div className="app-connection-notice" role="status">
          Account details couldn’t load. <RefreshButton />
        </div>
      </>
    );
  }
}

function Footer({
  contact,
  unavailable = false,
  branding = { logoUrl: "", socials: [] },
}: {
  contact?: Record<string, string>;
  unavailable?: boolean;
  branding?: { logoUrl: string; socials: SocialLink[] };
}) {
  return (
    <footer className="rh-footer rh-shell">
      <div>
        <Brand logoUrl={branding.logoUrl} />
        <p>Providing opportunities for the best hands on deck.</p>
        <SocialLinks links={branding.socials} />
      </div>
      <nav aria-label="Footer navigation">
        <Link href="/registration">REMOTE HUSTLE 1.0 registration</Link>
        <Link href="/jobs">Find work</Link>
        <Link href="/programs">Build skills</Link>
        <Link href="/about">About & contact</Link>
        <Link href="/faq">FAQs & help</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/admin">Team access</Link>
      </nav>
      <div className="rm-note">
        {(contact?.email || SUPPORT_EMAIL) && (
          <p>
            <a href={"mailto:" + (contact?.email || SUPPORT_EMAIL)}>
              {contact?.email || SUPPORT_EMAIL}
            </a>
          </p>
        )}
        {contact?.phone && <p>{contact.phone}</p>}
        {contact?.address && <p>{contact.address}</p>}
        {unavailable && (
          <p role="status">
            Contact details couldn’t load. <RefreshButton />
          </p>
        )}
      </div>
      <p>© {new Date().getFullYear()} REMOTE HUSTLE.</p>
    </footer>
  );
}

export function FooterFallback() {
  return <Footer />;
}

export async function SiteFooter() {
  const branding = await publishedBranding();
  try {
    return <Footer contact={await publishedContact()} branding={branding} />;
  } catch {
    console.error(
      "[site-shell] Published contact details temporarily unavailable.",
    );
    return <Footer unavailable branding={branding} />;
  }
}
