import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { AccountNotice, ProfileProgress } from "@/components/profile-progress";
import { Breadcrumbs, PageHeading, EmptyState } from "@/components/ui";
export default async function Workspace() {
  const context = await requireUser();
  const { data, error } = await context.db
    .from("applications")
    .select("id,status,created_at,jobs(title,company)")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(5);
  if (error) throw new Error("Unable to load applications.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs items={[{ label: "Your workspace" }]} />
      <PageHeading
        eyebrow="Your workspace"
        title={
          "Hello, " +
          (context.profile?.full_name.split(" ")[0] || "there") +
          "."
        }
        description="Your profile, progress and opportunities in one place."
      />
      <AccountNotice context={context} />
      <ProfileProgress context={context} />
      <div className="rm-actions">
        <Link className="rm-btn" href="/workspace/profile">
          {context.progress.percent === 100
            ? "Edit your profile"
            : "Complete your profile"}{" "}
          ↗
        </Link>
        <Link className="rm-btn rm-btn-light" href="/jobs">
          Explore jobs ↗
        </Link>
      </div>
      <section className="app-section">
        <h2>Your recent applications</h2>
        {data?.length ? (
          <div className="app-record-list">
            {data.map((a) => {
              const job = a.jobs as unknown as {
                title: string;
                company: string;
              };
              return (
                <Link
                  key={a.id}
                  className="app-record"
                  href="/workspace/applications"
                >
                  <span>
                    <strong>{job?.title || "Opportunity"}</strong>
                    <small>{job?.company}</small>
                  </span>
                  <span className="app-badge">{a.status}</span>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState title="Your next chapter starts with an application.">
            Your submitted applications will appear here.
          </EmptyState>
        )}
      </section>
    </main>
  );
}
