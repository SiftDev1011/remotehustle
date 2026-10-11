import { publicJob, publicMetadata } from "@/lib/seo";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const job = await publicJob((await params).id);
  return job
    ? publicMetadata(
        job.title + " at " + job.company,
        job.description.replace(/\s+/g, " ").slice(0, 160),
        "/jobs/" + job.id,
      )
    : {
        title: "Opportunity unavailable",
        robots: { index: false, follow: false },
      };
}
import { JobOverview, JobDescription } from "@/components/job-overview";
import { lists } from "@/lib/queries";
import { notFound } from "next/navigation";
import { serverDb } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/env";
import { getContext } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { applicationGate, type Job } from "@/lib/domain";
import { Breadcrumbs, TextArea, Notice } from "@/components/ui";
import { ApplicationGate, gateInput } from "@/components/profile-progress";
import { ActionForm } from "@/components/action-form";
import { applyAction } from "@/actions/jobs";
export default async function JobDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = (await params).id;
  if (!idSchema.safeParse(id).success || !supabaseConfigured()) notFound();
  const db = await serverDb();
  const { data, error } = await db
    .from("jobs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Unable to load this opportunity.");
  if (!data) notFound();
  const job = data as Job;
  const [context, taxonomy] = await Promise.all([getContext(), lists()]);
  const location = taxonomy.locations.find(
    (entry) => entry.id === job.location_id,
  )?.name;
  const gate = applicationGate(gateInput(context));
  const existing = context
    ? await context.db
        .from("applications")
        .select("id,status")
        .eq("job_id", id)
        .eq("user_id", context.user.id)
        .maybeSingle()
    : null;
  const closed =
    job.status !== "published" ||
    !!(job.closes_at && new Date(job.closes_at).getTime() <= Date.now());
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow app-job-detail">
      <Breadcrumbs
        items={[{ label: "Find work", href: "/jobs" }, { label: job.title }]}
      />
      <div className="app-job-detail-heading">
        <JobOverview job={job} location={location} page />
        <a className="rm-btn" href="#apply">
          {job.application_type === "internal"
            ? "Apply here"
            : "Apply on company site"}{" "}
          ↗
        </a>
      </div>
      <JobDescription job={job} location={location} />
      <section id="apply" className="app-card app-job-application">
        <h3>
          {job.application_type === "internal"
            ? "Apply here"
            : "Apply on company site"}
        </h3>
        {closed ? (
          <Notice>This opportunity is no longer accepting applications.</Notice>
        ) : existing?.data ? (
          <Notice tone="success">
            You’ve applied. Your current status is{" "}
            <strong>{existing.data.status}</strong>.
          </Notice>
        ) : (
          <>
            <ApplicationGate context={context} jobId={id} />
            {gate === "ready" &&
              (job.application_type === "external" ? (
                <>
                  <p className="rm-note">
                    You’ll continue to the company’s website. Their application
                    process and privacy terms apply.
                  </p>
                  <a
                    className="rm-btn"
                    href={"/jobs/" + id + "/apply-external"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Apply on company site ↗
                  </a>
                </>
              ) : (
                <ActionForm action={applyAction} label="Submit application">
                  <input type="hidden" name="job_id" value={id} />
                  <p className="rm-note">
                    Your current CV and profile will accompany this application.
                  </p>
                  <TextArea
                    label="A short note (optional)"
                    name="cover_note"
                    rows={4}
                    maxLength={3000}
                  />
                </ActionForm>
              ))}
          </>
        )}
      </section>
    </main>
  );
}
