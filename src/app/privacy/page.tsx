import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "Privacy notice",
    "How Remote Hustle handles account, application, purchase and contact information.",
    "/privacy",
  );
}
import { Breadcrumbs, PageHeading } from "@/components/ui";
import { POLICY_VERSION, SUPPORT_EMAIL } from "@/lib/site-details";
export default function Privacy() {
  const operator = process.env.LEGAL_OPERATOR_NAME?.trim();
  const contact = process.env.PRIVACY_CONTACT_EMAIL?.trim() || SUPPORT_EMAIL;
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <Breadcrumbs items={[{ label: "Privacy notice" }]} />
      <PageHeading
        title="Privacy notice"
        description={"Updated " + POLICY_VERSION}
      />
      <div className="app-prose">
        <h2>About this notice</h2>
        <p>
          This notice explains how personal information is used when you
          register, apply for opportunities or buy digital resources through
          Remote Hustle.{operator && <> The operator is {operator}.</>} For
          privacy enquiries, contact <a href={"mailto:" + contact}>{contact}</a>
          .
        </p>
        <h2>Information we collect</h2>
        <p>
          Account and profile information includes your name, email address,
          phone number, location, professional category, skills, experience,
          education, CV, professional links, preferences and interests. We also
          hold application records, account status, consent records and records
          needed to administer and protect the service.
        </p>
        <p>
          For purchases, we hold order details, payment references and status,
          discount use, purchase issue reports and support replies. The shop
          sells digital products and does not ask for a delivery address.
          Payment card details are entered with the payment provider and are not
          stored by Remote Hustle. Passwords are managed by our authentication
          provider and are not stored in a readable form by the app.
        </p>
        <p>
          When you contact us, we store your name, email address, subject and
          message so the team can respond. Avoid sending passwords, payment card
          details or identification documents through this form.
        </p>
        <p>
          Where enabled, Cloudflare Turnstile checks public forms for automated
          abuse. Contact rate limiting uses keyed hashes of an email address and
          network address; raw network addresses are not saved in the contact
          inbox. Expired rate-limit records are removed during subsequent
          submissions.
        </p>
        <h2>How we use your information</h2>
        <p>
          We use account and profile information to register and verify you,
          review your account, process applications and provide the services you
          request. We use order and payment records to fulfil purchases, provide
          downloads, investigate payment problems and respond to support
          requests. Necessary service messages include verification, password
          reset, account approval, application updates and purchase emails.
        </p>
        <p>
          Optional marketing is a separate choice. You can withdraw marketing
          consent in your profile without losing access to the service. Where
          applicable, processing may also be necessary to meet legal obligations
          or protect the service and its users. You can contact us about the
          basis for a particular use of your information.
        </p>
        <h2>Who can access your information</h2>
        <p>
          Authorised team members can access information relevant to their
          assigned responsibilities. An administrator reviewing an application
          can view the CV attached to it. Profiles and CVs are not a public
          member directory. If you apply through an employer's website, that
          organisation handles the information you submit under its own privacy
          notice.
        </p>
        <p>
          Authorised administrators can view aggregate activity counts derived
          from registrations, applications, contact submissions and purchases.
          These reports do not add advertising cookies or browsing-history
          tracking.
        </p>
        <h2>Service providers</h2>
        <p>
          Remote Hustle uses Vercel for hosting, Supabase for database and
          authentication services, Cloudflare R2 for file storage, Brevo for
          email and Paystack for payment processing. These services process
          information needed to perform their functions. Their infrastructure
          may process information outside Nigeria. Contact us for information
          about the arrangements relevant to your data.
        </p>
        <h2>Keeping and deleting information</h2>
        <p>
          Your profile and application records are kept while your account is
          maintained. When the team deletes an account, its profile and
          application records are removed and its CV files are queued for
          deletion. Order, payment, purchase support and financial correction
          records can remain after account deletion, with the account link
          removed. These retained records may still contain a receipt email or
          information you supplied in a support report; account deletion does
          not automatically erase every transaction record.
        </p>
        <p>
          You may ask us about the retention of specific records or request
          their deletion. We assess requests alongside the need to complete a
          service, resolve a complaint and meet applicable obligations. Copies
          held in backups may remain until those backups expire. Contact us for
          details about your records.
        </p>
        <h2>Security</h2>
        <p>
          Account checks and access permissions restrict who can view private
          information. CVs and purchased files use private storage and temporary
          download links. Keep your sign-in details private, and do not include
          passwords or payment card details in uploaded documents or support
          messages.
        </p>
        <h2>Your rights and complaints</h2>
        <p>
          Subject to applicable law, you may request access to or correction of
          your information, deletion, restriction of processing or portability,
          object to relevant processing, and withdraw consent where it is relied
          on. Contact <a href={"mailto:" + contact}>{contact}</a> to make a
          request. We may need to verify your identity. You may also raise a
          privacy complaint with the{" "}
          <a href="https://ndpc.gov.ng/">Nigeria Data Protection Commission</a>.
        </p>
        <h2>Cookies and browser storage</h2>
        <p>
          Authentication cookies maintain your sign-in session. Browser storage
          remembers the products in your cart. Remote Hustle does not include
          optional advertising or analytics trackers in this website.
        </p>
        <h2>Changes</h2>
        <p>
          The date above identifies this version of the notice. Please review it
          when using the service. For questions about a change or how it affects
          your information, contact us.
        </p>
      </div>
    </main>
  );
}
