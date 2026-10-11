import { requireSuperAdmin } from "@/lib/auth";
import { ADMIN_AREAS, type Membership } from "@/lib/domain";
import { Breadcrumbs, PageHeading, Input, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { inviteAdminAction, adminAccessAction } from "@/actions/admin";
function AccessChoices({ areas = [] }: { areas?: string[] }) {
  return (
    <fieldset className="app-choice-group">
      <legend>Assigned areas</legend>
      <div className="app-checkbox-grid">
        {ADMIN_AREAS.map((area) => (
          <label className="app-checkbox" key={area}>
            <input
              type="checkbox"
              name="areas"
              value={area}
              defaultChecked={areas.includes(area)}
            />
            <span>{area}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
export default async function Administrators() {
  const context = await requireSuperAdmin();
  const [members, profiles] = await Promise.all([
    context.db.from("admin_memberships").select("*").order("created_at"),
    context.db.from("profiles").select("user_id,full_name,email"),
  ]);
  if (members.error || profiles.error)
    throw new Error("Unable to load administrator accounts.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Admin", href: "/admin" },
          { label: "Administrator access" },
        ]}
      />
      <PageHeading title="Administrators" />
      <section className="app-card">
        <h3>Invite an administrator</h3>
        <p className="rm-note">
          They receive a secure invitation email to set their own password. No
          shared login credentials are created.
        </p>
        <ActionForm action={inviteAdminAction} label="Send invitation">
          <Input
            label="Full name"
            name="full_name"
            required
            minLength={2}
            maxLength={120}
          />
          <Input label="Email" name="email" type="email" required />
          <AccessChoices />
        </ActionForm>
      </section>
      <div className="app-record-list">
        {(members.data as Membership[]).map((member) => {
          const profile = profiles.data?.find(
            (p) => p.user_id === member.user_id,
          );
          return (
            <section className="app-card" key={member.user_id}>
              <div className="app-card-header">
                <div>
                  <h3>{profile?.full_name || "Administrator"}</h3>
                  <p className="rm-note">{profile?.email}</p>
                </div>
                <Badge>
                  {member.role === "super_admin"
                    ? "Workspace owner"
                    : member.active
                      ? "Active administrator"
                      : "Access disabled"}
                </Badge>
              </div>
              {member.role !== "super_admin" && (
                <ActionForm action={adminAccessAction} label="Save access">
                  <input type="hidden" name="user_id" value={member.user_id} />
                  <AccessChoices areas={member.areas} />
                  <label className="app-checkbox">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked={member.active}
                    />
                    <span>Administrator access active</span>
                  </label>
                </ActionForm>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
