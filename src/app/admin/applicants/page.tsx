import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { APPLICATION_STATUSES } from "@/lib/domain";
import { Breadcrumbs, PageHeading, EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { applicationStatusAction } from "@/actions/jobs";
export default async function Applicants({
  searchParams,
}: {
  searchParams: Promise<{ job?: string; status?: string }>;
}) {
  const context = await requireArea("jobs");
  const params = await searchParams;
  const requested = params.job;
  const status = APPLICATION_STATUSES.find((s) => s === params.status) || "";
  const jobId = idSchema.safeParse(requested).success ? requested! : "";
  let query = context.db
    .from("applications")
    .select("*,jobs(title,company),profiles(full_name,email)")
    .order("created_at", { ascending: false });
  if (jobId) query = query.eq("job_id", jobId);
  if (status) query = query.eq("status", status);
  const [applications, jobs] = await Promise.all([
    query,
    context.db.from("jobs").select("id,title").order("title"),
  ]);
  if (applications.error || jobs.error)
    throw new Error("Unable to load applicants.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Applicants" }]}
      />
      <PageHeading title="Applicants" />
      <form className="rm-searchbar" action="/admin/applicants">
        <Dropdown
          name="job"
          aria-label="Applicants for job"
          defaultValue={jobId}
        >
          <option value="">All jobs</option>
          {jobs.data?.map((job) => (
            <option key={job.id} value={job.id}>
              {job.title}
            </option>
          ))}
        </Dropdown>
        <Dropdown
          name="status"
          aria-label="Application status"
          defaultValue={status}
        >
          <option value="">All statuses</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Dropdown>
        <button className="rm-btn">View applicants</button>
      </form>
      {applications.data?.length ? (
        <div className="app-record-list">
          {applications.data.map((a) => (
            <article className="app-card" key={a.id}>
              <div className="app-card-header">
                <div>
                  <h3>{a.profiles?.full_name || "Applicant"}</h3>
                  <p className="rm-note">{a.profiles?.email}</p>
                  <p className="rm-note">
                    {a.jobs?.title} · {a.jobs?.company}
                  </p>
                </div>
                <a
                  className="rm-btn rm-btn-light"
                  href={"/api/files/cv/" + a.cv_id}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View/download CV
                </a>
              </div>
              {a.cover_note && (
                <p className="app-preline rm-note">{a.cover_note}</p>
              )}
              <ActionForm
                action={applicationStatusAction}
                label="Update status"
                className="app-inline-form"
              >
                <input name="id" type="hidden" value={a.id} />
                <Dropdown
                  name="status"
                  aria-label={
                    "Application status for " +
                    (a.profiles?.full_name || "applicant")
                  }
                  defaultValue={a.status}
                >
                  {APPLICATION_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </Dropdown>
              </ActionForm>
              <p className="rm-note">
                Submitted {new Date(a.created_at).toLocaleDateString("en-NG")}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No applicants in this view yet." />
      )}
      <Link className="rm-text-link" href="/admin/jobs">
        Back to jobs
      </Link>
    </main>
  );
}
