import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import {
  Breadcrumbs,
  PageHeading,
  EmptyState,
  Badge,
  Select,
} from "@/components/ui";
import { Dropdown } from "@/components/dropdown";
import { ActionForm } from "@/components/action-form";
import { reviewPurchaseIssueAction } from "@/actions/orders";
import type { PurchaseIssue } from "@/lib/commerce";
export default async function PurchaseIssues({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; order?: string; page?: string }>;
}) {
  const context = await requireArea("orders");
  const query = await searchParams;
  const status = ["open", "in_review", "resolved", "all"].includes(
    query.status || "",
  )
    ? query.status!
    : "active";
  const order = idSchema.safeParse(query.order).success ? query.order! : "";
  const page = Math.max(0, Math.min(10000, parseInt(query.page || "0") || 0));
  let request = context.db
    .from("purchase_issues")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * 30, page * 30 + 29);
  if (status === "active") request = request.neq("status", "resolved");
  else if (status !== "all") request = request.eq("status", status);
  if (order) request = request.eq("order_id", order);
  const { data, error, count } = await request;
  if (error) throw new Error("Unable to load purchase issues.");
  const pageLink = (p: number) =>
    "?" + new URLSearchParams({ status, order, page: String(p) });
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Purchase issues" },
        ]}
      />
      <PageHeading
        title="Purchase issues"
        description="Help customers with downloads, files and payments. Replies appear on their order page."
      />
      <form className="app-filter-bar">
        <input type="hidden" name="order" value={order} />
        <Dropdown name="status" aria-label="Issue status" defaultValue={status}>
          <option value="active">Needs attention</option>
          <option value="open">Open</option>
          <option value="in_review">In review</option>
          <option value="resolved">Resolved</option>
          <option value="all">All issues</option>
        </Dropdown>
        <button className="rm-btn">Filter</button>
        {order && <Link href="/admin/purchase-issues">All orders</Link>}
      </form>
      {data?.length ? (
        <div className="app-record-list">
          {(data as PurchaseIssue[]).map((issue) => (
            <article className="app-card" key={issue.id}>
              <div className="app-card-header">
                <Link
                  className="rm-text-link"
                  href={"/admin/orders/" + issue.order_id}
                >
                  Order {issue.order_id.slice(0, 8).toUpperCase()} ↗
                </Link>
                <Badge>{issue.status.replaceAll("_", " ")}</Badge>
              </div>
              <h3>
                {
                  {
                    download: "Download access",
                    file: "File problem",
                    payment: "Payment problem",
                    other: "Other issue",
                  }[issue.category]
                }
              </h3>
              <p className="app-preline">{issue.message}</p>
              <p className="rm-note">
                Reported{" "}
                {new Date(issue.created_at).toLocaleDateString("en-NG", {
                  timeZone: "UTC",
                })}
              </p>
              <ActionForm
                action={reviewPurchaseIssueAction}
                label="Update issue"
              >
                <input type="hidden" name="id" value={issue.id} />
                <Select
                  name="status"
                  id={"status-" + issue.id}
                  label="Issue status"
                  defaultValue={issue.status}
                >
                  <option value="open">Open</option>
                  <option value="in_review">In review</option>
                  <option value="resolved">Resolved</option>
                </Select>
                <div className="app-field">
                  <label htmlFor={"reply-" + issue.id}>
                    Reply to customer (required to resolve)
                  </label>
                  <textarea
                    id={"reply-" + issue.id}
                    name="reply"
                    maxLength={2000}
                    defaultValue={issue.admin_reply}
                  />
                </div>
              </ActionForm>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No purchase issues in this view." />
      )}
      <div className="app-inline-links">
        {page > 0 && <Link href={pageLink(page - 1)}>Previous</Link>}
        {(count || 0) > (page + 1) * 30 && (
          <Link href={pageLink(page + 1)}>Next</Link>
        )}
      </div>
    </main>
  );
}
