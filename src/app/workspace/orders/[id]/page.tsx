import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { Breadcrumbs, PageHeading } from "@/components/ui";
import { OrderDetail } from "@/components/order-detail";
import type { Order, OrderItem, Refund, PurchaseIssue } from "@/lib/commerce";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  const context = await requireUser("/workspace/orders/" + id);
  const [order, items, refunds, issues] = await Promise.all([
    context.db
      .from("orders")
      .select("*")
      .eq("id", id)
      .eq("user_id", context.user.id)
      .maybeSingle(),
    context.db.from("order_items").select("*").eq("order_id", id),
    context.db.from("refund_requests").select("*").eq("order_id", id),
    context.db
      .from("purchase_issues")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false }),
  ]);
  const failures = [
    ["orders", order.error],
    ["order_items", items.error],
    ["refund_requests", refunds.error],
    ["purchase_issues", issues.error],
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
  if (order.error || items.error || refunds.error || issues.error)
    throw new Error("Unable to load order.");
  if (!order.data) notFound();
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Your orders", href: "/workspace/orders" },
          { label: "Order " + id.slice(0, 8).toUpperCase() },
        ]}
      />
      <PageHeading title={"Order " + id.slice(0, 8).toUpperCase()} />
      <OrderDetail
        order={order.data as Order}
        items={items.data as OrderItem[]}
        refunds={refunds.data as Refund[]}
        issues={issues.data as PurchaseIssue[]}
      />
    </main>
  );
}
