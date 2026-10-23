import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "Find remote work",
    "Explore remote job opportunities and find a role that fits your experience.",
    "/jobs",
  );
}
import { Dropdown } from "@/components/dropdown";
import { publishedJobs, lists } from "@/lib/queries";
import { idSchema } from "@/lib/validation";
import { EMPLOYMENT_TYPES } from "@/lib/domain";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { JobBrowser } from "@/components/job-browser";
export default async function Jobs({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const category = idSchema.safeParse(value("category")).success
    ? value("category")
    : "";
  const location = idSchema.safeParse(value("location")).success
    ? value("location")
    : "";
  const employment =
    EMPLOYMENT_TYPES.find((t) => t === value("employment")) || "";
  const q = value("q").slice(0, 150);
  const [jobs, taxonomy] = await Promise.all([
    publishedJobs({ q, category, location, employment }),
    lists(),
  ]);
  return (
    <main id="rh-main" className="rm-page rm-shell app-jobs-page">
      <Breadcrumbs items={[{ label: "Find work" }]} />
      <h1 className="app-visually-hidden">Find work</h1>
      <form className="app-job-search" action="/jobs">
        <div className="rm-search-input">
          <input
            name="q"
            aria-label="Search jobs"
            placeholder="Role, skill or keyword"
            defaultValue={q}
            maxLength={150}
          />
        </div>
        <Dropdown
          name="category"
          aria-label="Job category"
          defaultValue={category}
        >
          <option value="">All categories</option>
          {taxonomy.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Dropdown>
        <Dropdown
          name="location"
          aria-label="Job location"
          defaultValue={location}
        >
          <option value="">All locations</option>
          {taxonomy.locations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Dropdown>
        <Dropdown
          name="employment"
          aria-label="Employment type"
          defaultValue={employment}
        >
          <option value="">All employment types</option>
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Dropdown>
        <button type="submit" className="rm-btn">
          Find jobs
        </button>
      </form>
      <p className="rm-note">
        {jobs.length} opportunit{jobs.length === 1 ? "y" : "ies"}
      </p>
      {jobs.length ? (
        <JobBrowser
          key={[q, category, location, employment].join("|")}
          jobs={jobs}
          locations={taxonomy.locations}
        />
      ) : (
        <EmptyState
          title={
            q || category || location || employment
              ? "No opportunities match those filters."
              : "Opportunities will appear here soon."
          }
        >
          Try a broader search or return when the team publishes new jobs.
        </EmptyState>
      )}
    </main>
  );
}
