import Link from "next/link";
import { getContext } from "@/lib/auth";
import { Breadcrumbs, PageHeading, Notice } from "@/components/ui";
import { RegistrationForm } from "@/components/registration-form";
import { RegistrationDetails } from "@/components/registration-details";
import { COUNTRIES } from "@/lib/registration";
import type { RegistrationRecord } from "@/lib/registration";
export const metadata = {
  title: "REMOTE HUSTLE 1.0 registration",
  robots: { index: false, follow: true },
};
export default async function Registration() {
  const c = await getContext();
  let body;
  if (!c)
    body = (
      <div className="app-card">
        <p>
          Create or sign in to your website account, then complete the programme
          form. Registration requires a verified email and an access code from
          the organisers.
        </p>
        <div className="app-inline-links">
          <Link className="rm-btn" href="/sign-up?next=%2Fregistration">
            Create an account
          </Link>
          <Link
            className="rm-btn rm-btn-secondary"
            href="/sign-in?next=%2Fregistration"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  else if (!c.user.email_confirmed_at)
    body = (
      <Notice>
        Verify your email before registering.{" "}
        <Link
          href={
            "/verify-email?next=%2Fregistration&email=" +
            encodeURIComponent(c.user.email || "")
          }
        >
          Send verification email
        </Link>
      </Notice>
    );
  else if (c.approval === "inactive")
    body = (
      <Notice tone="error">
        Your account is inactive. Contact the team for help.
      </Notice>
    );
  else {
    const [record, categories] = await Promise.all([
      c.db
        .from("programme_registrations")
        .select("*")
        .eq("user_id", c.user.id)
        .maybeSingle(),
      c.db.from("job_categories").select("id,name,active").order("name"),
    ]);
    if (record.error || categories.error)
      body = (
        <Notice tone="error">
          Registration is temporarily unavailable. Please try again shortly or
          contact the team.
        </Notice>
      );
    else if (record.data)
      body = (
        <>
          <Notice tone="success">
            Your registration has been received. Status: {record.data.status}.
            <p>Reference: {record.data.id}</p>
          </Notice>
          <RegistrationDetails
            record={record.data as RegistrationRecord}
            category={
              categories.data?.find((x) => x.id === record.data.category_id)
                ?.name
            }
          />
          <p className="rm-note">
            Need to correct a detail?{" "}
            <Link href="/about">Contact the team</Link> with your reference.
            Programme registration does not change your website account approval
            status.
          </p>
        </>
      );
    else {
      const active = (categories.data || []).filter((x) => x.active);
      body = active.length ? (
        <RegistrationForm
          email={c.user.email || ""}
          name={c.profile?.full_name || ""}
          phone={c.profile?.phone || ""}
          categories={active}
          countries={COUNTRIES}
        />
      ) : (
        <Notice>
          Registration categories are being prepared. Please check back soon.
        </Notice>
      );
    }
  }
  return (
    <main id="rh-main" className="rm-page rm-shell app-registration">
      <Breadcrumbs items={[{ label: "Programme registration" }]} />
      <PageHeading
        eyebrow="REMOTE HUSTLE 1.0"
        title="Official registration form"
        description="Please fill this form carefully. Your information will be used for communication, training, certificates and competition purposes."
      />
      {body}
    </main>
  );
}
