import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { lists } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import type { Job } from "@/lib/domain";
import { JobForm } from "@/components/job-form";
import { Breadcrumbs, PageHeading } from "@/components/ui";
export default async function EditJob({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireArea("jobs");
  const id = (await params).id;
  if (!idSchema.safeParse(id).success) notFound();
  const [job, link, taxonomy] = await Promise.all([
    context.db.from("jobs").select("*").eq("id", id).maybeSingle(),
    context.db
      .from("job_application_links")
      .select("url")
      .eq("job_id", id)
      .maybeSingle(),
    lists(),
  ]);
  if (job.error || link.error) throw new Error("Unable to load this job.");
  if (!job.data) notFound();
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Jobs", href: "/admin/jobs" },
          { label: "Edit opportunity" },
        ]}
      />
      <PageHeading title="Edit job" />
      <JobForm
        job={{ ...job.data, application_url: link.data?.url || null } as Job}
        lists={taxonomy}
      />
    </main>
  );
}
