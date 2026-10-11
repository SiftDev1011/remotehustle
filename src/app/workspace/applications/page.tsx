import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
export default async function MyApplications() {
  const context = await requireUser("/workspace/applications");
  const { data, error } = await context.db
    .from("applications")
    .select("*,jobs(title,company),application_events(status,created_at)")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load applications.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Workspace", href: "/workspace" },
          { label: "My applications" },
        ]}
      />
      <PageHeading
        title="Your applications"
        description="Track the applications you submit through Remote Hustle. Applications on company websites are managed by those companies."
      />
      {data?.length ? (
        <div className="app-record-list">
          {data.map((a) => (
            <article className="app-card" key={a.id}>
              <div className="app-card-header">
                <h3>{a.jobs?.title}</h3>
                <Badge>{a.status}</Badge>
              </div>
              <p className="rm-note">
                {a.jobs?.company} · Submitted{" "}
                {new Date(a.created_at).toLocaleDateString("en-NG")}
              </p>
              <details>
                <summary>Status history</summary>
                <ol className="app-timeline">
                  {[...(a.application_events || [])]
                    .sort((x, y) => x.created_at.localeCompare(y.created_at))
                    .map((e, i) => (
                      <li key={i}>
                        <strong>{e.status}</strong>
                        <span>
                          {new Date(e.created_at).toLocaleDateString("en-NG")}
                        </span>
                      </li>
                    ))}
                </ol>
              </details>
              <a
                className="rm-text-link"
                href={"/api/files/cv/" + a.cv_id}
                target="_blank"
                rel="noopener noreferrer"
              >
                View the CV used for this application ↗
              </a>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No applications yet.">
          Explore{" "}
          <Link className="rm-text-link" href="/jobs">
            available jobs
          </Link>{" "}
          to find your next opportunity.
        </EmptyState>
      )}
    </main>
  );
}
