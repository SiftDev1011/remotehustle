import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { ActionForm } from "@/components/action-form";
import { Disclosure } from "@/components/disclosure";
import { Breadcrumbs, PageHeading, Input, EmptyState } from "@/components/ui";
import { RegistrationDetails } from "@/components/registration-details";
import {
  createRegistrationCodeAction,
  toggleRegistrationCodeAction,
  reviewRegistrationAction,
} from "@/actions/registration";
import type { RegistrationRecord } from "@/lib/registration";
export default async function Registrations({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const c = await requireArea("users"),
    q = await searchParams,
    page = Math.max(1, Math.min(100000, Math.floor(Number(q.page) || 1)));
  const [rows, codes, categories] = await Promise.all([
    c.db
      .from("programme_registrations")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .order("id")
      .range((page - 1) * 30, page * 30 - 1),
    c.db
      .from("registration_codes")
      .select("id,label,active,expires_at,max_uses,uses,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    c.db.from("job_categories").select("id,name"),
  ]);
  if (rows.error || codes.error || categories.error)
    throw new Error(
      "Unable to load programme registrations. Check the database migration and connection.",
    );
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Team workspace", href: "/admin" },
          { label: "Programme registrations" },
        ]}
      />
      <PageHeading
        title="Programme registrations"
        description="Review REMOTE HUSTLE 1.0 submissions. Website account approval is managed separately under Workers."
      />
      <div className="app-inline-links">
        <Link className="rm-btn rm-btn-secondary" href="/registration">
          Open registration form
        </Link>
        <a
          className="rm-btn rm-btn-secondary"
          href="/api/admin/registrations/export"
        >
          Export registrations
        </a>
      </div>
      <Disclosure className="app-card" label="Access codes">
        <p className="rm-note">
          Create a code and copy it once. Share it directly with intended
          participants. Expiry dates use Lagos time. Only the latest 100 codes
          are listed.
        </p>
        <ActionForm
          action={createRegistrationCodeAction}
          label="Generate access code"
        >
          <Input
            name="label"
            label="Code label"
            minLength={2}
            maxLength={120}
            required
          />
          <Input
            name="max_uses"
            label="Maximum registrations (blank for no limit)"
            type="number"
            min={1}
            max={100000}
          />
          <Input name="expires_at" label="Expiry date (optional)" type="date" />
        </ActionForm>
        <div className="app-record-list">
          {codes.data?.map((code) => (
            <div className="app-card" key={code.id}>
              <strong>{code.label}</strong>
              <p>
                {code.uses} / {code.max_uses ?? "Unlimited"} registrations ·{" "}
                {code.active ? "Enabled" : "Disabled"}
                {code.expires_at
                  ? " · Expires " +
                    new Date(code.expires_at).toLocaleDateString("en-NG", {
                      timeZone: "Africa/Lagos",
                    })
                  : ""}
              </p>
              <ActionForm
                action={toggleRegistrationCodeAction}
                label={code.active ? "Disable code" : "Enable code"}
              >
                <input type="hidden" name="id" value={code.id} />
                <input
                  type="hidden"
                  name="active"
                  value={String(!code.active)}
                />
              </ActionForm>
            </div>
          ))}
        </div>
      </Disclosure>
      <p className="rm-note">{rows.count || 0} submissions</p>
      <div className="app-record-list">
        {rows.data?.map((row) => (
          <Disclosure
            key={row.id}
            className="app-card"
            label={
              <>
                {row.data.full_name} · {row.status}
              </>
            }
          >
            <p className="rm-note">
              Reference: {row.id} ·{" "}
              {new Date(row.created_at).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              })}{" "}
              (Lagos)
            </p>
            <RegistrationDetails
              record={row as RegistrationRecord}
              category={
                categories.data?.find((x) => x.id === row.category_id)?.name
              }
            />
            <ActionForm
              action={reviewRegistrationAction}
              label={
                row.status === "reviewed" ? "Reopen review" : "Mark reviewed"
              }
            >
              <input type="hidden" name="id" value={row.id} />
              <input
                type="hidden"
                name="reviewed"
                value={String(row.status !== "reviewed")}
              />
            </ActionForm>
          </Disclosure>
        ))}
      </div>
      {!rows.data?.length && (
        <EmptyState title="No programme registrations yet." />
      )}
      <div className="app-inline-links">
        {page > 1 && <Link href={"?page=" + (page - 1)}>Previous</Link>}
        <span>Page {page}</span>
        {page * 30 < (rows.count || 0) && (
          <Link href={"?page=" + (page + 1)}>Next</Link>
        )}
      </div>
    </main>
  );
}
