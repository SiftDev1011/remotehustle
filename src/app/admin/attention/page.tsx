import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import type { AttentionItem } from "@/lib/attention";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
export default async function Attention() {
  const context = await requireUser("/admin/attention");
  if (
    !context.membership?.active ||
    !context.user.email_confirmed_at ||
    context.approval === "inactive"
  )
    redirect("/access-denied");
  const { data, error } = await context.db.rpc("admin_attention");
  if (error) throw new Error("Unable to load items needing attention.");
  const items = ((data || []) as AttentionItem[]).filter(
    (item) => Number(item.total) > 0,
  );
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Needs attention" },
        ]}
      />
      <PageHeading
        title="Needs attention"
        description="Outstanding tasks in your assigned areas. Counts clear when the underlying work is resolved."
      />
      {items.length ? (
        <div className="app-record-list">
          {items.map((item) => (
            <Link
              className="app-card app-record-row"
              href={item.href}
              key={item.key}
            >
              <div>
                <h3>{item.label}</h3>
                <p className="rm-note">{item.description}</p>
              </div>
              <Badge>{item.total}</Badge>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="You're all caught up." />
      )}
    </main>
  );
}
