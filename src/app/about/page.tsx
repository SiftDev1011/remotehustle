import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "About Remote Hustle",
    "Learn about Remote Hustle and contact our team about opportunities, programmes and digital resources.",
    "/about",
  );
}
import { ContactForm } from "@/components/contact-form";
import Link from "next/link";
import { SUPPORT_EMAIL } from "@/lib/site-details";
import { websiteContent } from "@/lib/queries";
import { Breadcrumbs, PageHeading } from "@/components/ui";
export default async function About() {
  const { content } = await websiteContent();
  const about = content.about,
    contact: Record<string, string> = {
      email: SUPPORT_EMAIL,
      ...content.contact,
    };
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <Breadcrumbs items={[{ label: "About Remote Hustle" }]} />
      <PageHeading title="About Remote Hustle" />
      <figure className="rh-about-photo">
        <img
          src={about?.image_url || "/photos/about-workspace.jpg"}
          width={1448}
          height={1086}
          alt="A prepared remote workspace with a laptop, notebook and document folder"
        />
      </figure>
      <div className="app-prose app-section">
        <h2>{about?.title || "A place to prepare and move forward."}</h2>
        <p className="app-preline">
          {about?.body ||
            "Remote Hustle brings remote opportunities, professional profiles, training, internships and career resources together. Workers can present their experience, explore roles and take their next step through one platform."}
        </p>
        <p>
          The Remote Hustle team manages opportunities, programmes, products and
          partnering organisations. Applications on company websites follow the
          employer’s own process.
        </p>
      </div>
      <Link className="rm-btn" href="/sign-up">
        Create your profile ↗
      </Link>
      {contact && (
        <section id="contact" className="app-card app-section">
          <h2>Get in touch.</h2>
          {contact.email && (
            <p>
              <a href={"mailto:" + contact.email}>{contact.email}</a>
            </p>
          )}
          {contact.phone && <p>{contact.phone}</p>}
          {contact.address && <p className="app-preline">{contact.address}</p>}
          <ContactForm />
        </section>
      )}
    </main>
  );
}
