import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
import { money } from "@/lib/management";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const context = await requireArea("orders"),
    query = await searchParams,
    page = Math.max(0, Math.min(10000, Math.floor(Number(query.page) || 0)));
  let request = context.db
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * 30, page * 30 + 29);
  if (["pending", "failed", "paid", "refunded"].includes(query.status || ""))
    request = request.eq("payment_status", query.status);
  const { data, error, count } = await request;
  if (error) throw new Error("Unable to load orders.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Team workspace", href: "/admin" },
          { label: "Orders" },
        ]}
      />
      <PageHeading title="Orders & downloads." />
      <div className="app-inline-links">
        <Link className="rm-btn rm-btn-light" href="/admin/purchase-issues">
          Purchase issues
        </Link>
        <Link className="rm-btn rm-btn-light" href="/admin/refunds">
          Payment corrections
        </Link>
      </div>
      <form className="app-filter-bar">
        <label>
          Payment status{" "}
          <Dropdown name="status" defaultValue={query.status || ""}>
            <option value="">All</option>
            {["pending", "failed", "paid", "refunded"].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Dropdown>
        </label>
        <button className="rm-btn">Filter</button>
      </form>
      {data?.length ? (
        <div className="app-record-list">
          {data.map((o) => (
            <Link
              className="app-card app-record-row"
              key={o.id}
              href={"/admin/orders/" + o.id}
            >
              <div>
                <h3>
                  {o.id.slice(0, 8).toUpperCase()} · {money(o.total_minor)}
                </h3>
                <p className="rm-note">
                  {o.receipt_email} ·{" "}
                  {new Date(o.created_at).toLocaleDateString("en-NG")}
                </p>
              </div>
              <Badge>
                {o.payment_status} ·{" "}
                {o.has_physical ? o.fulfillment_status : "digital"}
              </Badge>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="No matching orders." />
      )}
      <div className="app-inline-links">
        {page > 0 && (
          <Link
            href={
              "?page=" +
              (page - 1) +
              "&status=" +
              encodeURIComponent(query.status || "")
            }
          >
            Previous
          </Link>
        )}
        {(count || 0) > (page + 1) * 30 && (
          <Link
            href={
              "?page=" +
              (page + 1) +
              "&status=" +
              encodeURIComponent(query.status || "")
            }
          >
            Next
          </Link>
        )}
      </div>
    </main>
  );
}
