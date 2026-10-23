import { notFound } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import { lists } from "@/lib/queries";
import type { Profile } from "@/lib/domain";
import { Breadcrumbs, PageHeading, Input } from "@/components/ui";
import { ProfileForm } from "@/components/profile-form";
import { ActionForm } from "@/components/action-form";
import { deleteWorkerAction } from "@/actions/admin";
export default async function WorkerDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await requireArea("users");
  const id = (await params).id;
  if (!idSchema.safeParse(id).success) notFound();
  const [record, skills, taxonomy] = await Promise.all([
    context.db.from("profiles").select("*").eq("user_id", id).maybeSingle(),
    context.db.from("profile_skills").select("skill_id").eq("user_id", id),
    lists(),
  ]);
  if (record.error || skills.error)
    throw new Error("Unable to load this profile.");
  if (!record.data) notFound();
  const profile = record.data as Profile;
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Workers", href: "/admin/users" },
          { label: profile.full_name || "Worker" },
        ]}
      />
      <PageHeading
        title={profile.full_name || "Worker profile"}
        description={profile.email}
      />
      {profile.cv_id && (
        <a
          className="rm-btn rm-btn-light"
          href={"/api/files/cv/" + profile.cv_id}
          target="_blank"
          rel="noopener noreferrer"
        >
          View/download CV
        </a>
      )}
      <ProfileForm
        profile={profile}
        skillIds={(skills.data || []).map((s) => s.skill_id)}
        lists={taxonomy}
        allowMarketingChange={false}
      />
      <section className="app-card app-danger-section">
        <h3>Delete this account</h3>
        <p className="rm-note">
          This removes the account, profile and application records. Private
          files enter the cleanup queue. Administrator accounts are protected
          from this control.
        </p>
        <ActionForm action={deleteWorkerAction} label="Delete user" danger>
          <input type="hidden" name="user_id" value={id} />
          <Input
            name="confirm_email"
            label="Type the user’s email address to confirm"
            type="email"
            required
          />
        </ActionForm>
      </section>
    </main>
  );
}
