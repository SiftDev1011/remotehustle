import { safeNext } from "@/lib/domain";
export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { PageHeading, Breadcrumbs, ConfigurationNotice } from "@/components/ui";
import { SignUpForm } from "@/components/auth-forms";
import { supabaseConfigured } from "@/lib/env";
export default async function SignUp({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <Breadcrumbs items={[{ label: "Create an account" }]} />
      <PageHeading
        title="Create your account"
        description="Enter your details to get started."
      />
      {!supabaseConfigured() && <ConfigurationNotice />}
      <SignUpForm next={next} />
      <p className="rm-note">
        Already have an account?{" "}
        <Link
          className="rm-text-link"
          href={"/sign-in?next=" + encodeURIComponent(next)}
        >
          Sign in
        </Link>
      </p>
    </main>
  );
}
