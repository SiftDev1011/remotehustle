import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "Training & internships",
    "Explore practical training and internship opportunities with Remote Hustle.",
    "/programs",
  );
}
import { homepageRecords } from "@/lib/queries";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
export default async function Programs({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const records = await homepageRecords(100);
  const type = (await searchParams).type;
  const programs = type
    ? records.programs.filter((p) => p.type === type)
    : records.programs;
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <Breadcrumbs items={[{ label: "Training & internships" }]} />
      <PageHeading
        spacious
        title="Build toward your next step."
        description="Explore training and internship opportunities announced by Remote Hustle."
      />
      {programs.length ? (
        <div className="app-record-list">
          {programs.map((p) => (
            <article className="app-card" key={p.id}>
              {p.image_url && (
                <img
                  className="app-program-image"
                  src={p.image_url}
                  alt=""
                  width={600}
                  height={320}
                />
              )}
              <Badge>{p.type}</Badge>
              <h3>{p.title}</h3>
              {(p.starts_on || p.duration) && (
                <p className="rm-note">
                  {p.starts_on
                    ? new Date(p.starts_on).toLocaleDateString("en-NG")
                    : ""}
                  {p.duration ? " · " + p.duration : ""}
                </p>
              )}
              <p className="rm-note app-preline">{p.description}</p>
              {p.link && (
                <a
                  className="rm-text-link"
                  href={p.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Programme information ↗
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Programmes will appear here when announced." />
      )}
    </main>
  );
}
