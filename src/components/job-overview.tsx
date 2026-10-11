import { salaryLabel, type Job } from "@/lib/domain";

export function JobOverview({
  job,
  location,
  page = false,
}: {
  job: Job;
  location?: string;
  page?: boolean;
}) {
  const Title = page ? "h1" : "h2";
  return (
    <div className="app-job-overview">
      <Title>{job.title}</Title>
      <p className="app-job-company">{job.company}</p>
      <p className="app-job-location">
        Remote{location ? ` · ${location}` : ""}
      </p>
      <p className="app-job-compensation">
        {salaryLabel(job)}
        {job.salary_min != null ? ` / ${job.salary_period}` : ""} ·{" "}
        {job.employment_type}
      </p>
    </div>
  );
}

export function JobDescription({
  job,
  location,
}: {
  job: Job;
  location?: string;
}) {
  return (
    <div className="app-job-description">
      <section>
        <h2>Job details</h2>
        <dl>
          <div>
            <dt>Pay</dt>
            <dd>
              {salaryLabel(job)}
              {job.salary_min != null ? ` / ${job.salary_period}` : ""}
            </dd>
          </div>
          <div>
            <dt>Job type</dt>
            <dd>{job.employment_type}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>Remote{location ? ` · ${location}` : ""}</dd>
          </div>
        </dl>
      </section>
      <section>
        <h2>Full job description</h2>
        <p className="app-preline">{job.description}</p>
      </section>
      {job.requirements && (
        <section>
          <h2>Requirements</h2>
          <p className="app-preline">{job.requirements}</p>
        </section>
      )}
    </div>
  );
}
