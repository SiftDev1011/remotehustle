import { Disclosure } from "@/components/disclosure";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { deleteJobAction } from "@/actions/jobs";
export default async function AdminJobs({
  searchParams,
}: {
  searchParams: Promise<{ attention?: string }>;
}) {
  const expired = (await searchParams).attention === "expired";
  const context = await requireArea("jobs");
  let request = context.db
    .from("jobs")
    .select("id,title,company,status,application_type,applications(id)")
    .order("created_at", { ascending: false });
  if (expired)
    request = request
      .eq("status", "published")
      .lte("closes_at", new Date().toISOString());
  const { data, error } = await request;
  if (error) throw new Error("Unable to load jobs.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Jobs" }]}
      />
      <PageHeading title={expired ? "Jobs past their closing date" : "Jobs"} />
      {expired && (
        <Link className="rm-text-link" href="/admin/jobs">
          View all jobs
        </Link>
      )}
      <Link className="rm-btn" href="/admin/jobs/new">
        Add opportunity ↗
      </Link>
      {data?.length ? (
        <div className="app-record-list">
          {data.map((job) => (
            <article className="app-card" key={job.id}>
              <div className="app-card-header">
                <div>
                  <h3>{job.title}</h3>
                  <p className="rm-note">
                    {job.company} ·{" "}
                    {job.application_type === "internal"
                      ? "Apply here"
                      : "Apply on company site"}
                  </p>
                </div>
                <Badge>{job.status}</Badge>
              </div>
              <div className="rm-actions">
                <Link className="rm-text-link" href={"/admin/jobs/" + job.id}>
                  Edit opportunity
                </Link>
                <Link
                  className="rm-text-link"
                  href={"/admin/applicants?job=" + job.id}
                >
                  Applicants ({job.applications.length})
                </Link>
                <Link className="rm-text-link" href={"/jobs/" + job.id}>
                  View page
                </Link>
              </div>
              <Disclosure label="Remove opportunity">
                <ActionForm action={deleteJobAction} label="Delete job" danger>
                  <input type="hidden" name="id" value={job.id} />
                  <label className="app-checkbox">
                    <input type="checkbox" name="confirm" required />
                    <span>I confirm this job should be removed.</span>
                  </label>
                </ActionForm>
              </Disclosure>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No opportunities yet.">
          Add the first confirmed job, then publish it when ready.
        </EmptyState>
      )}
    </main>
  );
}
