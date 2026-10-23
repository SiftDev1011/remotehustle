export const metadata = { robots: { index: false, follow: false } };
import { AdminFrame } from "@/components/admin-frame";
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { canManage } from "@/lib/domain";
import { signOutAction } from "@/actions/auth";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = await requireUser("/admin");
  if (
    !context.user.email_confirmed_at ||
    context.approval === "inactive" ||
    !context.membership?.active
  )
    redirect("/access-denied");
  const membership = context.membership;
  return (
    <AdminFrame
      sidebar={
        <WorkspaceSidebar title="Team workspace" scrollable>
          <nav aria-label="Admin navigation">
            <Link href="/admin">Overview</Link>
            <Link href="/admin/attention">Needs attention</Link>
            <Link href="/admin/analytics">Analytics</Link>
            {canManage(membership, "users") && (
              <>
                <Link href="/admin/users">Workers</Link>
                <Link href="/admin/registrations">Programme registrations</Link>
              </>
            )}
            {canManage(membership, "jobs") && (
              <>
                <Link href="/admin/jobs">Jobs</Link>
                <Link href="/admin/applicants">Applicants</Link>
                <Link href="/admin/lists">Categories, skills & locations</Link>
              </>
            )}
            {canManage(membership, "partners") && (
              <Link href="/admin/partners">Partnering Organisations</Link>
            )}
            {canManage(membership, "content") && (
              <>
                <Link href="/admin/programs">Training & internships</Link>
                <Link href="/admin/faqs">FAQs & helper answers</Link>
                <Link href="/admin/content">Website content</Link>
                <Link href="/admin/messages">Contact messages</Link>
                <Link href="/admin/testimonials">Testimonials & impact</Link>
              </>
            )}
            {canManage(membership, "shop") && (
              <>
                <Link href="/admin/products">Products</Link>
                <Link href="/admin/product-categories">Product categories</Link>
                <Link href="/admin/discounts">Discount codes</Link>
              </>
            )}
            {canManage(membership, "orders") && (
              <>
                <Link href="/admin/orders">Orders & downloads</Link>
                <Link href="/admin/purchase-issues">Purchase issues</Link>
                <Link href="/admin/payments">Payment checks</Link>
                <Link href="/admin/refunds">Payment corrections</Link>
              </>
            )}
            {membership.role === "super_admin" && (
              <>
                <Link href="/admin/administrators">Administrators</Link>
                <Link href="/admin/operations">Operations</Link>
              </>
            )}
          </nav>
          <form action={signOutAction}>
            <button className="rm-text-link">Sign out</button>
          </form>
        </WorkspaceSidebar>
      }
    >
      {children}
    </AdminFrame>
  );
}
