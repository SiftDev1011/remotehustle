import { requireUser } from "@/lib/auth";
import { Breadcrumbs, PageHeading, Select } from "@/components/ui";
import { money } from "@/lib/management";
export default async function Analytics({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const context = await requireUser("/admin/analytics"),
    query = await searchParams;
  const days = [7, 30, 90].includes(Number(query.days))
    ? Number(query.days)
    : 30;
  const { data, error } = await context.db.rpc("admin_analytics", {
    p_days: days,
  });
  if (error) throw new Error("Unable to load activity analytics.");
  const labels: Record<string, string> = {
    registrations: "Registrations",
    verified_registrations: "Verified registrations",
    applications: "Applications submitted",
    contact_submissions: "Contact submissions",
    orders_created: "Orders created",
    paid_orders: "Paid orders",
    paid_total_minor: "Paid order value",
    refunded_orders: "Refunded orders from this period",
  };
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Analytics" }]}
      />
      <PageHeading
        title="Activity analytics"
        description="Recorded activity in your assigned areas. Counts update from the database."
      />
      <form className="app-filter-bar">
        <Select label="Period" name="days" defaultValue={String(days)}>
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </Select>
        <button className="rm-btn">Apply</button>
      </form>
      <div className="app-stats-grid">
        {Object.entries(labels)
          .filter(([key]) => key in (data || {}))
          .map(([key, label]) => (
            <article key={key} className="app-card">
              <span>{label}</span>
              <strong className="app-stat-number">
                {key === "paid_total_minor"
                  ? money(Number(data[key]))
                  : Number(data[key]).toLocaleString("en-NG")}
              </strong>
            </article>
          ))}
      </div>
      {!Object.keys(data || {}).length && (
        <p>
          No analytics categories are included in your assigned permissions.
        </p>
      )}
      <p className="rm-note">
        Registrations and verification count accounts created in the selected
        period, including team accounts. Deleted records are excluded.
        Applications count submissions made here, not visits to employer sites.
        Contact submissions exclude messages marked as spam.
      </p>
      {Array.isArray(data?.daily_paid) && (
        <>
          <h2>Daily paid orders</h2>
          <p className="rm-note">
            Paid totals use the confirmation date and current paid status. They
            include zero-value orders, exclude fully refunded orders and do not
            deduct payment fees or partial corrections. This is an activity
            report, not an accounting statement or a visitor conversion rate.
            Dates below use West Africa Time.
          </p>
          <div className="app-table-wrap">
            <table className="app-data-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Orders</th>
                  <th scope="col">Value</th>
                </tr>
              </thead>
              <tbody>
                {data.daily_paid.length ? (
                  data.daily_paid.map(
                    (d: {
                      day: string;
                      orders: number;
                      total_minor: number;
                    }) => (
                      <tr key={d.day}>
                        <td>{d.day}</td>
                        <td>{d.orders}</td>
                        <td>{money(Number(d.total_minor))}</td>
                      </tr>
                    ),
                  )
                ) : (
                  <tr>
                    <td colSpan={3}>No paid orders in this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
