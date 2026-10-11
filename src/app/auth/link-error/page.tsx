export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { PageHeading } from "@/components/ui";
export default function LinkError() {
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <PageHeading
        eyebrow="Link expired"
        title="Let’s get you a fresh link."
        description="This email link has expired, has already been used or is invalid."
      />
      <div className="rm-actions">
        <Link className="rm-btn" href="/verify-email">
          Resend verification
        </Link>
        <Link className="rm-btn rm-btn-light" href="/forgot-password">
          Reset password
        </Link>
      </div>
    </main>
  );
}
