export const metadata = { robots: { index: false, follow: false } };
import { PageHeading, Breadcrumbs, ConfigurationNotice } from "@/components/ui";
import { ForgotPasswordForm } from "@/components/auth-forms";
import { supabaseConfigured } from "@/lib/env";
export default function ForgotPassword() {
  return (
    <main id="rh-main" className="rm-page rm-shell app-auth">
      <Breadcrumbs items={[{ label: "Reset password" }]} />
      <PageHeading
        title="A fresh way back in."
        description="We’ll email a link to reset your password."
      />
      {!supabaseConfigured() && <ConfigurationNotice />}
      <ForgotPasswordForm />
    </main>
  );
}
