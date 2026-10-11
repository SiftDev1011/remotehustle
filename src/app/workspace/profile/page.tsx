import { requireUser } from "@/lib/auth";
import { lists } from "@/lib/queries";
import { Breadcrumbs, PageHeading } from "@/components/ui";
import { AccountNotice, ProfileProgress } from "@/components/profile-progress";
import { ProfileForm } from "@/components/profile-form";
import { CvUpload } from "@/components/cv-upload";
export default async function MyProfile() {
  const [context, taxonomy] = await Promise.all([
    requireUser("/workspace/profile"),
    lists(),
  ]);
  if (!context.profile) throw new Error("Profile record is missing.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Workspace", href: "/workspace" },
          { label: "My profile" },
        ]}
      />
      <PageHeading
        title="Your profile"
        description="Complete every required part before applying. You can update your details whenever your account is active."
      />
      <AccountNotice context={context} />
      <ProfileProgress context={context} />
      <ProfileForm
        profile={context.profile}
        skillIds={context.skillIds}
        lists={taxonomy}
      />
      <CvUpload
        currentName={context.cv?.original_name}
        currentId={context.cv?.status === "ready" ? context.cv.id : undefined}
      />
    </main>
  );
}
