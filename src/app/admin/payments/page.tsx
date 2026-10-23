import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { adminCheckPaymentAction } from "@/actions/orders";
export default async function PaymentChecks({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const context = await requireArea("orders");
  const page = Math.max(
    0,
    Math.min(10000, parseInt((await searchParams).page || "0") || 0),
  );
  const { data, error, count } = await context.db
    .from("payment_attempts")
    .select("*", { count: "exact" })
    .in("state", ["initializing", "pending"])
    .lt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
    .order("created_at")
    .range(page * 30, page * 30 + 29);
  if (error) throw new Error("Unable to load payment checks.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Payment checks" },
        ]}
      />
      <PageHeading
        title="Payment checks"
        description="Attempts awaiting confirmation for more than 15 minutes. An unfinished checkout does not necessarily mean a customer was charged."
      />
      {data?.length ? (
        <div className="app-record-list">
          {data.map((p) => (
            <article className="app-card" key={p.reference}>
              <div className="app-card-header">
                <Link
                  className="rm-text-link"
                  href={"/admin/orders/" + p.order_id}
                >
                  Order {p.order_id.slice(0, 8).toUpperCase()}
                </Link>
                <Badge>{p.state}</Badge>
              </div>
              <p className="rm-note app-wrap">{p.reference}</p>
              <ActionForm
                action={adminCheckPaymentAction}
                label="Check with Paystack"
              >
                <input type="hidden" name="reference" value={p.reference} />
              </ActionForm>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No payments need checking." />
      )}
      <div className="app-inline-links">
        {page > 0 && <Link href={"?page=" + (page - 1)}>Previous</Link>}
        {(count || 0) > (page + 1) * 30 && (
          <Link href={"?page=" + (page + 1)}>Next</Link>
        )}
      </div>
    </main>
  );
}
