export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { PageHeading, Breadcrumbs, ConfigurationNotice } from "@/components/ui";
import { VerificationForm } from "@/components/auth-forms";
import { supabaseConfigured } from "@/lib/env";
export default async function VerifyEmail({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email = "" } = await searchParams;
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <Breadcrumbs items={[{ label: "Verify email" }]} />
      <PageHeading
        eyebrow="One quick check"
        title="Check your inbox."
        description="Open the verification email from Remote Hustle to confirm your email address. Check your spam folder if it hasn’t arrived."
      />
      {!supabaseConfigured() && <ConfigurationNotice />}
      <VerificationForm email={email.slice(0, 254)} />
      <p className="rm-note">
        Verified already?{" "}
        <Link className="rm-text-link" href="/sign-in">
          Sign in
        </Link>
      </p>
    </main>
  );
}
