export const metadata = { robots: { index: false, follow: false } };
import { WorkspaceSidebar } from "@/components/workspace-sidebar";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { signOutAction } from "@/actions/auth";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireUser();
  return (
    <div className="app-workspace">
      <WorkspaceSidebar title="Your workspace">
        <nav aria-label="Workspace navigation">
          <Link href="/workspace">Overview</Link>
          <Link href="/workspace/profile">My profile</Link>
          <Link href="/workspace/applications">My applications</Link>
          <Link href="/workspace/orders">Orders & downloads</Link>
          <Link href="/jobs">Find work</Link>
          <Link href="/programs">Training & internships</Link>
        </nav>
        <form action={signOutAction}>
          <button className="rm-text-link">Sign out</button>
        </form>
      </WorkspaceSidebar>
      {children}
    </div>
  );
}
