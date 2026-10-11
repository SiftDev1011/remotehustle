import { requireArea } from "@/lib/auth";
import { lists } from "@/lib/queries";
import { JobForm } from "@/components/job-form";
import { Breadcrumbs, PageHeading } from "@/components/ui";
export default async function NewJob() {
  await requireArea("jobs");
  const taxonomy = await lists();
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Jobs", href: "/admin/jobs" },
          { label: "Add opportunity" },
        ]}
      />
      <PageHeading title="Create job" />
      <JobForm lists={taxonomy} />
    </main>
  );
}
