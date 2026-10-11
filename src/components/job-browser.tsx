"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { salaryLabel, type Job, type ListItem } from "@/lib/domain";
import { JobOverview, JobDescription } from "./job-overview";

export function JobBrowser({
  jobs,
  locations,
}: {
  jobs: Job[];
  locations: ListItem[];
}) {
  const [selected, setSelected] = useState(jobs[0]?.id);
  const panel = useRef<HTMLElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const job = jobs.find((item) => item.id === selected) || jobs[0];
  const location = (item: Job) =>
    locations.find((entry) => entry.id === item.location_id)?.name;
  useEffect(() => {
    const navigation = document.querySelector(".app-navigation");
    if (!navigation) return;
    const measure = () =>
      root.current?.style.setProperty(
        "--jobs-nav-height",
        `${navigation.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (panel.current) panel.current.scrollTop = 0;
  }, [job?.id]);
  if (!job) return null;
  return (
    <div className="app-job-browser" ref={root}>
      <div className="app-job-list" aria-label="Job results">
        {jobs.map((item) => (
          <Link
            key={item.id}
            href={`/jobs/${item.id}`}
            className="app-job-result"
            data-selected={job.id === item.id}
            aria-current={job.id === item.id ? "true" : undefined}
            onClick={(event) => {
              if (
                !matchMedia("(min-width: 881px)").matches ||
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey
              )
                return;
              event.preventDefault();
              setSelected(item.id);
            }}
          >
            <span className="app-job-method">
              {item.application_type === "internal"
                ? "Apply here"
                : "Apply on company site"}
            </span>
            <h2>{item.title}</h2>
            <p className="app-job-company">{item.company}</p>
            <p className="app-job-location">
              Remote{location(item) ? ` · ${location(item)}` : ""}
            </p>
            <div className="app-job-tags">
              <span>
                {salaryLabel(item)}
                {item.salary_min != null ? ` / ${item.salary_period}` : ""}
              </span>
              <span>{item.employment_type}</span>
            </div>
            <p className="app-job-excerpt">{item.description}</p>
            <span className="app-job-open">
              View job <span aria-hidden="true">↗</span>
            </span>
          </Link>
        ))}
      </div>
      <section
        className="app-job-preview"
        ref={panel}
        tabIndex={0}
        aria-label="Selected job preview"
      >
        <div className="app-job-preview-heading" key={job.id}>
          <JobOverview job={job} location={location(job)} />
          <div className="rm-actions">
            <Link className="rm-btn" href={`/jobs/${job.id}#apply`}>
              {job.application_type === "internal"
                ? "Apply here"
                : "Apply on company site"}{" "}
              <span aria-hidden="true">↗</span>
            </Link>
            <Link className="rm-text-link" href={`/jobs/${job.id}`}>
              Full job details ↗
            </Link>
          </div>
        </div>
        <JobDescription job={job} location={location(job)} />
      </section>
      <span className="app-visually-hidden" role="status">
        Previewing {job.title} at {job.company}
      </span>
    </div>
  );
}
