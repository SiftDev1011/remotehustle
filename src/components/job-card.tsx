import Link from "next/link";
import { salaryLabel, type Job } from "@/lib/domain";
export function JobCard({ job, location }: { job: Job; location?: string }) {
  return (
    <article className="rh-job">
      <span className="rh-job-logo" aria-hidden="true">
        {job.company.slice(0, 2).toUpperCase()}
      </span>
      <div className="rh-job-info">
        <h3>
          <Link href={"/jobs/" + job.id}>{job.title}</Link>
        </h3>
        <p className="rh-company">{job.company}</p>
        <p className="rh-job-meta">
          Remote{location ? " · " + location : ""}
          <span>{job.employment_type}</span>
        </p>
      </div>
      <div className="rh-job-pay">
        <strong>{salaryLabel(job)}</strong>
        {job.salary_min != null && <small>per {job.salary_period}</small>}
      </div>
      <Link className="app-job-link" href={"/jobs/" + job.id}>
        View opportunity <span aria-hidden="true">↗</span>
      </Link>
    </article>
  );
}
