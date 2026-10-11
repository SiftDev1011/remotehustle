import Link from "next/link";
import { requireArea } from "@/lib/auth";
import {
  Breadcrumbs,
  PageHeading,
  EmptyState,
  Select,
  TextArea,
  Badge,
} from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { reviewContactAction } from "@/actions/operations";
export default async function Messages({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { db } = await requireArea("content"),
    query = await searchParams;
  const status = ["new", "in_progress", "resolved", "spam", "all"].includes(
    query.status || "",
  )
    ? query.status!
    : "active";
  const page = Math.max(0, Math.min(10000, parseInt(query.page || "0") || 0));
  let request = db
    .from("contact_messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * 20, page * 20 + 19);
  if (status === "active")
    request = request.in("status", ["new", "in_progress"]);
  else if (status !== "all") request = request.eq("status", status);
  const { data, error, count } = await request;
  if (error) throw new Error("Unable to load contact messages.");
  const href = (n: number) =>
    "?" + new URLSearchParams({ status, page: String(n) });
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Contact messages" },
        ]}
      />
      <PageHeading
        title="Contact messages"
        description="Website enquiries. Reply using your company mailbox; internal notes are visible only to your team."
      />
      <form className="app-filter-bar">
        <Select label="Status" name="status" defaultValue={status}>
          <option value="active">Needs attention</option>
          <option value="new">New</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
          <option value="spam">Spam</option>
          <option value="all">All messages</option>
        </Select>
        <button className="rm-btn">Filter</button>
      </form>
      {!data?.length ? (
        <EmptyState title="No messages in this view." />
      ) : (
        <div className="app-record-list">
          {data.map((m) => (
            <article className="app-card app-contact-message" key={m.id}>
              <div className="app-card-header">
                <h2>{m.subject}</h2>
                <Badge>{m.status.replaceAll("_", " ")}</Badge>
              </div>
              <p>
                {m.name} ·{" "}
                <a
                  href={
                    "mailto:" +
                    encodeURIComponent(m.email) +
                    "?subject=" +
                    encodeURIComponent("Re: " + m.subject)
                  }
                >
                  {m.email}
                </a>
              </p>
              <p className="rm-note">
                {new Date(m.created_at).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos",
                })}{" "}
                WAT
              </p>
              <p className="app-preline">{m.message}</p>
              <ActionForm action={reviewContactAction}>
                <input type="hidden" name="id" value={m.id} />
                <Select
                  label="Message status"
                  name="status"
                  id={"status-" + m.id}
                  defaultValue={m.status}
                >
                  <option value="new">New</option>
                  <option value="in_progress">In progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="spam">Spam</option>
                </Select>
                <TextArea
                  label="Internal note"
                  name="note"
                  id={"note-" + m.id}
                  defaultValue={m.internal_note}
                  maxLength={2000}
                />
              </ActionForm>
            </article>
          ))}
        </div>
      )}
      <nav className="app-filter-bar" aria-label="Message pages">
        {page > 0 && <Link href={href(page - 1)}>Previous</Link>}
        {(count || 0) > (page + 1) * 20 && (
          <Link href={href(page + 1)}>Next</Link>
        )}
      </nav>
    </main>
  );
}
