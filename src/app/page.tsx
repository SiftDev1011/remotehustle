import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "Work. Learn. Move forward.",
    "Remote jobs, practical training, internships and career resources. Providing opportunities for the best hands on deck.",
    "/",
  );
}
import { TestimonialStrip } from "@/components/testimonial-strip";
import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { ServiceAccordion } from "@/components/service-accordion";
import { PartnerStrip } from "@/components/partner-strip";
import { CategoryMotion } from "@/components/category-motion";
import { JobCard } from "@/components/job-card";
import { EmptyState } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import {
  publishedJobs,
  homepageRecords,
  lists,
  websiteContent,
  shopRecords,
} from "@/lib/queries";

export default async function Home() {
  const [jobs, records, taxonomy, website, shop] = await Promise.all([
    publishedJobs({}, 3),
    homepageRecords(),
    lists(),
    websiteContent(),
    shopRecords(),
  ]);
  const about = website.content.about;
  const images = website.content["home-images"];
  return (
    <main id="rh-main">
      <ServiceAccordion content={website.content} />
      <section
        className="rh-search-section rh-shell"
        aria-label="Search remote opportunities"
      >
        <form action="/jobs" className="rh-hero-search">
          <label className="rh-search-field">
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <circle cx="10.5" cy="10.5" r="6.5" />
              <path d="m15.5 15.5 5 5" />
            </svg>
            <span>
              <b>What are you looking for?</b>
              <input
                name="q"
                placeholder="Role, skill or keyword"
                aria-label="Role, skill or keyword"
                maxLength={150}
              />
            </span>
          </label>
          <label className="rh-search-field">
            <svg
              aria-hidden="true"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
              <circle cx="12" cy="10" r="2.4" />
            </svg>
            <span>
              <b>Where can you work?</b>
              <Dropdown name="location" aria-label="Location">
                <option value="">Anywhere</option>
                {taxonomy.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Dropdown>
            </span>
          </label>
          <button type="submit" className="rh-button rh-button-yellow">
            Find opportunities ↗
          </button>
        </form>
      </section>
      <section
        className="rh-discover rh-shell"
        aria-label="Featured opportunities"
      >
        <div className="rh-section-head">
          <h2>Explore your next opportunity.</h2>
          <Link className="rh-text-link" href="/jobs">
            View all ↗
          </Link>
        </div>
        {jobs.length ? (
          <div className="rh-list">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                location={
                  taxonomy.locations.find((l) => l.id === job.location_id)?.name
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState title="Your next opportunity is on its way.">
            Published jobs will appear here as the team adds them.
          </EmptyState>
        )}
      </section>
      <section
        className="rh-learning rh-shell"
        aria-label="Training and internships"
      >
        <div>
          <span className="rh-section-label">Learn with purpose</span>
          <h2>Make room for what’s next.</h2>
          <p className="rm-note">
            Discover practical training and internships for your next step.
          </p>
          <div className="rh-courses">
            {records.programs.length ? (
              records.programs.map((p) => (
                <Link key={p.id} className="rh-course" href="/programs">
                  <span className="rh-course-symbol">↗</span>
                  <span>
                    <strong>{p.title}</strong>
                    <small>{p.type}</small>
                  </span>
                </Link>
              ))
            ) : (
              <p className="rm-note">
                Programmes will appear here when announced.
              </p>
            )}
          </div>
          <Link className="rh-button" href="/programs">
            Explore programmes ↗
          </Link>
        </div>
        <div className="rh-learning-photo">
          <img
            src={images?.learning_image_url || "/photos/learning-books.jpg"}
            width={1086}
            height={1448}
            alt={
              images?.learning_image_url
                ? images.learning_image_alt || "Learning and career preparation"
                : "A quiet workspace with a notebook and practical study materials"
            }
            loading="lazy"
          />
        </div>
      </section>
      <section className="rh-about rh-shell" id="rh-about">
        <div className="rh-about-copy">
          <p className="rh-section-label">About Remote Hustle</p>
          <h2>{about?.title || "Opportunity begins with preparation."}</h2>
          <p className="app-preline">
            {about?.body ||
              "Remote Hustle brings remote opportunities, professional profiles, training, internships and career resources together. It gives workers a place to prepare, explore and take their next step."}
          </p>
          <Link className="rh-button" href="/about">
            About Remote Hustle ↗
          </Link>
        </div>
        <figure className="rh-about-photo">
          <img
            src={
              images?.about_image_url ||
              about?.image_url ||
              "/photos/about-workspace.jpg"
            }
            width={1448}
            height={1086}
            alt={
              images?.about_image_url
                ? images.about_image_alt || "About Remote Hustle"
                : "A laptop, notebook and document folder on an unoccupied desk"
            }
            loading="lazy"
          />
        </figure>
      </section>
      <section className="rh-shell app-home-shop">
        <div className="rh-section-head">
          <div>
            <p className="rh-section-label">The Remote Hustle shop</p>
            <h2>Show up prepared.</h2>
          </div>
          <Link className="rh-text-link" href="/shop">
            Explore resources ↗
          </Link>
        </div>
        {shop.products.length ? (
          <div className="app-product-grid">
            {shop.products.slice(0, 3).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          <EmptyState title="Resources for your next step.">
            Career tools will appear here when available.
          </EmptyState>
        )}
      </section>
      {(website.testimonials.length > 0 || website.metrics.length > 0) && (
        <section
          className="rh-shell app-impact"
          aria-label="Community experiences and impact"
        >
          {website.metrics.length > 0 && (
            <div className="app-impact-grid">
              {website.metrics.map((m) => (
                <div key={m.id}>
                  <strong>{m.value}</strong>
                  <p>{m.label}</p>
                </div>
              ))}
            </div>
          )}
          <TestimonialStrip testimonials={website.testimonials} />
        </section>
      )}
      <PartnerStrip partners={records.partners} />
      <CategoryMotion categories={taxonomy.categories} />
    </main>
  );
}
