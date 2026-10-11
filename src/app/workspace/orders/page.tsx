import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  Breadcrumbs,
  PageHeading,
  EmptyState,
  Badge,
  Notice,
} from "@/components/ui";
import { money } from "@/lib/management";
export default async function Orders({
  searchParams,
}: {
  searchParams: Promise<{ confirmation?: string }>;
}) {
  const context = await requireUser("/workspace/orders");
  const query = await searchParams;
  const { data, error } = await context.db
    .from("orders")
    .select("id,total_minor,payment_status,created_at")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Unable to load orders.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Workspace", href: "/workspace" },
          { label: "Your orders" },
        ]}
      />
      <PageHeading title="Your orders & downloads." />
      {query.confirmation && (
        <Notice>
          Payment confirmation is pending. Open your order to check its status.
        </Notice>
      )}
      {data.length ? (
        <div className="app-record-list">
          {data.map((o) => (
            <Link
              className="app-card app-record-row"
              href={"/workspace/orders/" + o.id}
              key={o.id}
            >
              <div>
                <h3>Order {o.id.slice(0, 8).toUpperCase()}</h3>
                <p>
                  {new Date(o.created_at).toLocaleDateString("en-NG")} ·{" "}
                  {money(o.total_minor)}
                </p>
              </div>
              <Badge>{o.payment_status}</Badge>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Your orders will appear here.">
          Explore the shop to find resources for your next step.
        </EmptyState>
      )}
    </main>
  );
}
