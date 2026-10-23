export const metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { PageHeading } from "@/components/ui";
export default function AccessDenied() {
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <PageHeading
        eyebrow="Access restricted"
        title="This area needs permission."
        description="Your administrator account has not been assigned access to this area. Ask the workspace owner to update your permissions."
      />
      <Link className="rm-btn" href="/workspace">
        Your workspace
      </Link>
    </main>
  );
}
