import Link from "next/link";
import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { Breadcrumbs, PageHeading, Select, TextArea } from "@/components/ui";
import { OrderDetail } from "@/components/order-detail";
import { ActionForm } from "@/components/action-form";
import {
  setFulfillmentAction,
  adminCheckPaymentAction,
} from "@/actions/orders";
import type { Order, OrderItem, Refund, PurchaseIssue } from "@/lib/commerce";
export default async function AdminOrder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireArea("orders"),
    { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const [order, items, refunds, issues, payments] = await Promise.all([
    context.db.from("orders").select("*").eq("id", id).maybeSingle(),
    context.db.from("order_items").select("*").eq("order_id", id),
    context.db.from("refund_requests").select("*").eq("order_id", id),
    context.db
      .from("purchase_issues")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
    context.db
      .from("payment_attempts")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const failures = [
    ["orders", order.error],
    ["order_items", items.error],
    ["refund_requests", refunds.error],
    ["purchase_issues", issues.error],
    ["payment_attempts", payments.error],
  ] as const;
  for (const [table, error] of failures) {
    if (error) {
      // Server logs identify the failed query without exposing order data or credentials.
      console.error("[orders] Database query failed", {
        table,
        code: error.code || "NO_DATABASE_CODE",
        connectionFailure: /fetch|network|timeout|timed out/i.test(
          error.message || "",
        ),
      });
    }
  }
  if (
    order.error ||
    items.error ||
    refunds.error ||
    issues.error ||
    payments.error
  )
    throw new Error("Unable to load order.");
  if (!order.data) notFound();
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Orders", href: "/admin/orders" },
          { label: id.slice(0, 8).toUpperCase() },
        ]}
      />
      <PageHeading title={"Order " + id.slice(0, 8).toUpperCase()} />
      <OrderDetail
        order={order.data as Order}
        items={items.data as OrderItem[]}
        refunds={refunds.data as Refund[]}
        issues={issues.data as PurchaseIssue[]}
        admin
      />
      {order.data.has_physical && (
        <section className="app-card app-section">
          <h2>Delivery progress</h2>
          <ActionForm action={setFulfillmentAction}>
            <input type="hidden" name="id" value={id} />
            <Select
              name="status"
              label="Order stage"
              defaultValue={order.data.fulfillment_status}
            >
              {["processing", "shipped", "delivered"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
            <TextArea
              name="tracking_note"
              label="Delivery / tracking note shown to customer"
              maxLength={1000}
              defaultValue={order.data.tracking_note}
            />
          </ActionForm>
        </section>
      )}
      <section className="app-section">
        <h2>Payment attempts</h2>
        {payments.data.map((p) => (
          <div className="app-card" key={p.reference}>
            <p className="app-wrap">
              {p.reference} · {p.state}
            </p>
            <ActionForm
              action={adminCheckPaymentAction}
              label="Check with Paystack"
            >
              <input type="hidden" name="reference" value={p.reference} />
            </ActionForm>
          </div>
        ))}
      </section>
      {refunds.data.length > 0 && (
        <Link className="rm-btn" href={"/admin/refunds?order=" + id}>
          Review refunds ↗
        </Link>
      )}
    </main>
  );
}
