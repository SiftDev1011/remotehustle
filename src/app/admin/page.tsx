import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ADMIN_AREAS, canManage } from "@/lib/domain";
import { Breadcrumbs, PageHeading, Notice } from "@/components/ui";
export default async function AdminHome() {
  const context = await requireUser("/admin");
  const links = {
    users: "/admin/users",
    jobs: "/admin/jobs",
    shop: "/admin/products",
    orders: "/admin/orders",
    partners: "/admin/partners",
    content: "/admin/content",
  };
  const labels = {
    users: "Review registrations",
    jobs: "Manage opportunities",
    shop: "Manage products",
    orders: "Orders & downloads",
    partners: "Partnering Organisations",
    content: "Website content",
  };

  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs items={[{ label: "Team workspace" }]} />
      <PageHeading
        title="Overview"
        description="Manage the areas assigned to your administrator account."
      />
      <div className="app-admin-grid">
        {ADMIN_AREAS.filter((area) => canManage(context.membership, area)).map(
          (area) => (
            <Link className="app-card" href={links[area]} key={area}>
              <span className="rm-eyebrow">{area}</span>
              <h3>{labels[area]} ↗</h3>
            </Link>
          ),
        )}
      </div>
      {context.membership?.role === "super_admin" && (
        <Link className="rm-btn" href="/admin/administrators">
          Administrator access ↗
        </Link>
      )}
    </main>
  );
}
