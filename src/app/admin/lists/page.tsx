import { Disclosure } from "@/components/disclosure";
import { requireArea } from "@/lib/auth";
import { Breadcrumbs, PageHeading, Input, EmptyState } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { listAction, removeListAction, hideListAction } from "@/actions/admin";
export default async function ManagedLists() {
  const context = await requireArea("jobs");
  const definitions = [
    { table: "job_categories", label: "Job categories" },
    { table: "skills", label: "Skills" },
    { table: "locations", label: "Locations" },
  ];
  const records = await Promise.all(
    definitions.map((d) => context.db.from(d.table).select("*").order("name")),
  );
  if (records.some((r) => r.error))
    throw new Error("Unable to load managed lists.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Managed lists" }]}
      />
      <PageHeading
        title="Categories, skills & locations"
        description="Manage choices for worker profiles and job filters. Hide a choice to stop new selections while preserving existing assignments. Only unassigned choices can be deleted."
      />
      <div className="app-admin-grid">
        {definitions.map((def, i) => (
          <section className="app-card" key={def.table}>
            <h3>{def.label}</h3>
            <ActionForm action={listAction} label="Add">
              <input type="hidden" name="table" value={def.table} />
              <Input
                name="name"
                label={"New " + def.label.toLowerCase()}
                required
                minLength={2}
                maxLength={100}
              />
              <input type="hidden" name="active" value="on" />
            </ActionForm>
            {records[i].data?.length ? (
              records[i].data!.map((record) => (
                <Disclosure
                  key={record.id}
                  label={record.name + (!record.active ? " (hidden)" : "")}
                >
                  <ActionForm
                    action={listAction}
                    label="Save"
                    key={String(record.active)}
                  >
                    <input type="hidden" name="table" value={def.table} />
                    <input type="hidden" name="id" value={record.id} />
                    <Input
                      label="Name"
                      name="name"
                      defaultValue={record.name}
                      required
                      minLength={2}
                      maxLength={100}
                    />
                    <label className="app-checkbox">
                      <input
                        type="checkbox"
                        name="active"
                        defaultChecked={record.active}
                      />
                      <span>Available for new selections</span>
                    </label>
                  </ActionForm>
                  {record.active && (
                    <ActionForm
                      action={hideListAction}
                      label="Hide from new selections"
                    >
                      <input type="hidden" name="table" value={def.table} />
                      <input type="hidden" name="id" value={record.id} />
                    </ActionForm>
                  )}
                  {!record.active && (
                    <p className="rm-note">
                      Hidden from new selections. To restore this choice, check
                      “Available for new selections” and save.
                    </p>
                  )}
                  <ActionForm
                    action={removeListAction}
                    label="Delete permanently"
                    danger
                  >
                    <input type="hidden" name="table" value={def.table} />
                    <input type="hidden" name="id" value={record.id} />
                    <p className="rm-note">
                      Deletion is only possible after all jobs and profiles stop
                      using this choice.
                    </p>
                  </ActionForm>
                </Disclosure>
              ))
            ) : (
              <EmptyState title="No records yet." />
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
