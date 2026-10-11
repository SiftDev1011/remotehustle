export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { PageHeading, Notice } from "@/components/ui";
import { ResetPasswordForm } from "@/components/auth-forms";
import { getContext } from "@/lib/auth";
export default async function ResetPassword() {
  const context = await getContext();
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <PageHeading title="Choose a new password." />
      {context ? (
        <ResetPasswordForm />
      ) : (
        <Notice tone="error">
          This link expired or is invalid.{" "}
          <Link className="rm-text-link" href="/forgot-password">
            Request another reset email.
          </Link>
        </Notice>
      )}
    </main>
  );
}
