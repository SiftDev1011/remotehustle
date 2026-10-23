import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "Terms of use",
    "Terms for using REMOTE HUSTLE, applying for opportunities and purchasing digital resources.",
    "/terms",
  );
}
import Link from "next/link";
import { websiteContent } from "@/lib/queries";
import { Breadcrumbs, PageHeading } from "@/components/ui";
import {
  POLICY_VERSION,
  PURCHASE_POLICY,
  SUPPORT_EMAIL,
} from "@/lib/site-details";
export default async function Terms() {
  const { content } = await websiteContent();
  const operator = process.env.LEGAL_OPERATOR_NAME?.trim();
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <Breadcrumbs items={[{ label: "Terms" }]} />
      <PageHeading
        title="Terms of use"
        description={"Version " + POLICY_VERSION}
      />
      <div className="app-prose">
        <p>
          These terms apply to your use of REMOTE HUSTLE, including accounts,
          job applications and purchases of digital resources.
          {operator && <> The operator is {operator}.</>} Contact{" "}
          <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a> with questions
          about the service.
        </p>
        <h2>Your account</h2>
        <p>
          Provide accurate information, use an email address you control and
          keep your password private. Verify your email, obtain account approval
          and complete the required profile details before applying through
          REMOTE HUSTLE or checking out. Keep your profile up to date. Our{" "}
          <Link href="/privacy">privacy notice</Link> explains how your
          information is used.
        </p>
        <h2>Opportunities and applications</h2>
        <p>
          REMOTE HUSTLE publishes opportunities supplied or approved by the
          team. Applying does not guarantee employment, an interview or
          acceptance. Employers make their own decisions. External application
          links lead to another organisation's process and terms. Read the role
          requirements before applying.
        </p>
        <h2>Permitted use</h2>
        <p>
          Use the platform lawfully. Do not submit false or misleading
          information, impersonate someone, upload malicious files, misuse other
          users' information or attempt to bypass access restrictions. You must
          have permission to upload the material you provide.
        </p>
        <h2>Your documents</h2>
        <p>
          Your CV remains your material. You permit its use for the application
          and administration purposes described in the privacy notice. Keep
          documents relevant and avoid including unnecessary sensitive
          information.
        </p>
        <h2>Digital products and programmes</h2>
        <p>
          Prices are displayed in Nigerian naira. Checkout shows the total and
          any discount before payment. Purchased digital resources become
          available on your order page after payment is confirmed. The shop does
          not sell physical products. Review the description, file requirements
          and any stated usage conditions before buying. Training and internship
          requirements are stated with each programme.
        </p>
        <h2>Purchase support and downloads</h2>
        <p className="app-preline">
          {content.commerce?.refund_policy?.trim() || PURCHASE_POLICY}
        </p>
        <p>
          To report a download, file or payment problem, open{" "}
          <Link href="/workspace/orders">Your orders</Link> and select Report a
          purchase issue. Replies appear on the order page. If you cannot access
          your account, email{" "}
          <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a> with your
          order reference. Do not include passwords or payment card details.
        </p>
        <h2>Account restrictions and closure</h2>
        <p>
          We may restrict or deactivate accounts to protect the service, address
          misuse or inaccurate registrations, or enforce these terms. Authorised
          administrators can correct records and delete accounts. Contact us to
          request a review or account closure.
        </p>
        <h2>Availability and complaints</h2>
        <p>
          Maintenance, connection problems or provider interruptions can affect
          access. If you experience a problem, contact us with the relevant
          account, application or order reference so we can investigate. These
          terms and any purchase policy do not limit rights or remedies that
          cannot lawfully be excluded.
        </p>
        <h2>Changes and contact</h2>
        <p>
          The version date above identifies these terms. Please review the terms
          and purchase policy before registering or making a purchase. Send
          questions and complaints to{" "}
          <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>.
        </p>
      </div>
    </main>
  );
}
