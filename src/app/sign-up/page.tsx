export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { PageHeading, Breadcrumbs, ConfigurationNotice } from "@/components/ui";
import { SignUpForm } from "@/components/auth-forms";
import { supabaseConfigured } from "@/lib/env";
export default function SignUp() {
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <Breadcrumbs items={[{ label: "Create an account" }]} />
      <PageHeading
        title="Create your account"
        description="Enter your details to get started."
      />
      {!supabaseConfigured() && <ConfigurationNotice />}
      <SignUpForm />
      <p className="rm-note">
        Already have an account?{" "}
        <Link className="rm-text-link" href="/sign-in">
          Sign in
        </Link>
      </p>
    </main>
  );
}
