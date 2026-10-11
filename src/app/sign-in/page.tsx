export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import {
  PageHeading,
  Breadcrumbs,
  ConfigurationNotice,
  Notice,
} from "@/components/ui";
import { SignInForm } from "@/components/auth-forms";
import { supabaseConfigured } from "@/lib/env";
import { safeNext } from "@/lib/domain";
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const query = await searchParams;
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <Breadcrumbs items={[{ label: "Sign in" }]} />
      <PageHeading title="Sign in" />
      {query.reason === "session" && (
        <Notice>Your session may have expired. Sign in to continue.</Notice>
      )}
      {query.reset === "1" && (
        <Notice tone="success">
          Your password has been updated. Sign in with your new password.
        </Notice>
      )}
      {!supabaseConfigured() && <ConfigurationNotice />}
      <SignInForm next={safeNext(query.next)} />
      <p className="rm-note">
        New here?{" "}
        <Link className="rm-text-link" href="/sign-up">
          Create an account
        </Link>
      </p>
      <Link className="rm-text-link" href="/verify-email">
        Resend verification email
      </Link>
    </main>
  );
}
