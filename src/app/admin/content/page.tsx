import { SOCIAL_PLATFORMS } from "@/lib/brand-settings";
import { SUPPORT_EMAIL, PURCHASE_POLICY } from "@/lib/site-details";
import { Disclosure } from "@/components/disclosure";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { saveContentAction } from "@/actions/management";
import { ActionForm } from "@/components/action-form";
import { AssetUpload } from "@/components/asset-upload";
import { Breadcrumbs, PageHeading, Input, TextArea } from "@/components/ui";
export default async function Content() {
  const context = await requireArea("content");
  const { data, error } = await context.db.from("site_content").select("*");
  if (error) throw new Error("Unable to load website content.");
  const sections = [
    { key: "branding", title: "Site logo" },
    { key: "socials", title: "Social media links" },
    { key: "home-images", title: "Homepage images" },
    { key: "about", title: "About REMOTE HUSTLE" },
    { key: "contact", title: "Contact details" },
    { key: "commerce", title: "Purchase support and downloads" },
    ...[
      "Overview",
      "Remote jobs",
      "Training",
      "Internships",
      "Professional profile",
      "Career resources",
    ].map((title, i) => ({
      key: "service-" + i,
      title: "Accordion · " + title,
    })),
  ];
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Team workspace", href: "/admin" },
          { label: "Website content" },
        ]}
      />
      <PageHeading
        title="Website content"
        description="Publish approved copy and imagery. Unpublished sections use the website’s existing introductory copy."
      />
      <div className="app-inline-links">
        <Link href="/admin/programs">Programmes</Link>
        <Link href="/admin/testimonials">Testimonials</Link>
        <Link href="/admin/impact">Impact figures</Link>
      </div>
      <div className="app-record-list">
        {sections.map((section) => {
          const row = data?.find((x) => x.key === section.key),
            v = row?.value || {};
          return (
            <Disclosure
              className="app-card"
              key={section.key}
              label={section.title}
            >
              <ActionForm action={saveContentAction}>
                <input type="hidden" name="key" value={section.key} />
                {section.key === "branding" && (
                  <>
                    <p className="rm-note">
                      Upload the official logo, then publish and save. It
                      appears in the header, footer and site icon. A square,
                      transparent PNG works best for small icons. Clearing the
                      image restores the wordmark. Search engines refresh icons
                      on their own schedule.
                    </p>
                    <AssetUpload
                      area="content"
                      name="logo_url"
                      label="Official logo"
                      initial={v.logo_url || ""}
                    />
                  </>
                )}
                {section.key === "socials" && (
                  <>
                    <p className="rm-note">
                      Enter full HTTPS profile links. Leave a field blank to
                      hide its icon in the footer.
                    </p>
                    {SOCIAL_PLATFORMS.map((p) => (
                      <Input
                        key={p.key}
                        label={p.label}
                        name={p.key}
                        type="url"
                        maxLength={2000}
                        defaultValue={v[p.key] || ""}
                      />
                    ))}
                  </>
                )}
                {section.key === "home-images" && (
                  <>
                    <p className="rm-note">
                      Replace either homepage picture, then publish and save.
                      Clearing a selection restores the existing default image.
                      About text is managed separately below.
                    </p>
                    <AssetUpload
                      area="content"
                      name="learning_image_url"
                      label="Make room for what’s next. — image"
                      initial={v.learning_image_url || ""}
                    />
                    <Input
                      name="learning_image_alt"
                      label="Learning image description"
                      maxLength={240}
                      defaultValue={v.learning_image_alt || ""}
                    />
                    <AssetUpload
                      area="content"
                      name="about_image_url"
                      label="Opportunity begins with preparation. — image"
                      initial={v.about_image_url || ""}
                    />
                    <Input
                      name="about_image_alt"
                      label="About image description"
                      maxLength={240}
                      defaultValue={v.about_image_alt || ""}
                    />
                    <p className="rm-note">
                      Image descriptions help people using screen readers.
                      Briefly describe what the replacement picture shows.
                    </p>
                  </>
                )}
                {section.key === "about" && (
                  <>
                    <Input
                      name="title"
                      label="Heading"
                      required
                      defaultValue={v.title || ""}
                    />
                    <TextArea
                      name="body"
                      label="About text"
                      required
                      minLength={20}
                      defaultValue={v.body || ""}
                    />
                    <AssetUpload
                      area="content"
                      name="image_url"
                      initial={v.image_url || ""}
                    />
                  </>
                )}
                {section.key === "contact" && (
                  <>
                    <Input
                      name="email"
                      label="Contact email"
                      type="email"
                      required
                      defaultValue={v.email || SUPPORT_EMAIL}
                    />
                    <Input
                      name="phone"
                      label="Phone"
                      defaultValue={v.phone || ""}
                    />
                    <TextArea
                      name="address"
                      label="Business address"
                      defaultValue={v.address || ""}
                    />
                  </>
                )}
                {section.key === "commerce" && (
                  <>
                    <p className="rm-note">
                      This policy appears at checkout and on the terms page.
                      Confirm it with the business owner before opening the
                      shop.
                    </p>
                    <TextArea
                      name="refund_policy"
                      label="Purchase support and download policy"
                      minLength={20}
                      required
                      defaultValue={v.refund_policy || PURCHASE_POLICY}
                    />
                  </>
                )}
                {section.key.startsWith("service-") && (
                  <>
                    <TextArea
                      name="copy"
                      label="Card description"
                      minLength={10}
                      maxLength={500}
                      required
                      defaultValue={v.copy || ""}
                    />
                    <AssetUpload
                      area="content"
                      name="image_url"
                      initial={v.image_url || ""}
                    />
                  </>
                )}
                <label className="app-check">
                  <input
                    type="checkbox"
                    name="published"
                    defaultChecked={row?.published || false}
                  />
                  Publish this content
                </label>
              </ActionForm>
            </Disclosure>
          );
        })}
      </div>
    </main>
  );
}
