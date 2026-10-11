import { requireSuperAdmin } from "@/lib/auth";
import { Breadcrumbs, PageHeading, Badge, Notice } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { RefreshButton } from "@/components/refresh-button";
import { retryEmailAction } from "@/actions/operations";
export default async function Operations() {
  const { db } = await requireSuperAdmin();
  const { data, error } = await db.rpc("admin_operations");
  if (error) throw new Error("Unable to load operational status.");
  const configured = (keys: string[]) =>
    keys.every((k) => !!process.env[k]?.trim());
  const checks: [[string, string[]], ...[string, string[]][]] = [
    ["Email delivery", ["BREVO_API_KEY", "EMAIL_FROM_ADDRESS"]],
    [
      "Contact protection",
      [
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
        "TURNSTILE_SECRET_KEY",
        "CONTACT_RATE_SECRET",
      ],
    ],
    ["Scheduled maintenance", ["CRON_SECRET"]],
    ["Payments", ["PAYSTACK_SECRET_KEY"]],
  ];
  const h = data.maintenance,
    stale =
      !h?.finished_at ||
      Date.now() - new Date(h.finished_at).getTime() > 26 * 3600000;
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Operations" }]}
      />
      <PageHeading
        title="Operations"
        description="Service configuration and delivery queues. Only super admins can access this page."
      />
      <RefreshButton label="Refresh status" />
      <div className="app-stats-grid">
        {checks.map(([name, keys]) => (
          <article className="app-card" key={name}>
            <h3>{name}</h3>
            <Badge>
              {configured(keys) ? "Variables present" : "Setup needed"}
            </Badge>
          </article>
        ))}
      </div>
      <p className="rm-note">
        Variable presence does not confirm that credentials, sender
        authentication or provider accounts work.
      </p>
      <section className="app-card app-section">
        <h2>Daily maintenance</h2>
        <Badge>{stale ? "Needs checking" : h?.status || "Not recorded"}</Badge>
        <p>
          Last completion:{" "}
          {h?.finished_at
            ? new Date(h.finished_at).toLocaleString("en-NG", {
                timeZone: "Africa/Lagos",
              }) + " WAT"
            : "No completed run recorded"}
        </p>
        <p className="rm-note">
          This processes payment checks, email retries and file cleanup. It does
          not back up the database or files.
        </p>
        <p>Files awaiting cleanup: {data.cleanup_pending}</p>
      </section>
      <section className="app-section">
        <h2>Service email delivery</h2>
        <p className="rm-note">
          Queued: {data.email_counts.queued || 0} · Sending:{" "}
          {data.email_counts.sending || 0} · Accepted by provider:{" "}
          {data.email_counts.sent || 0} · Failed:{" "}
          {data.email_counts.failed || 0}. Provider acceptance does not
          guarantee inbox delivery. Supabase authentication emails use a
          separate SMTP path.
        </p>
        <Notice>
          Before retrying a failed email, check Brevo’s delivery logs. An
          earlier attempt may have been accepted even if its database update
          failed.
        </Notice>
        <div className="app-record-list">
          {data.emails.map(
            (e: {
              id: string;
              kind: string;
              status: string;
              attempts: number;
              last_error: string | null;
            }) => (
              <article className="app-card" key={e.id}>
                <h3>{e.kind.replaceAll("-", " ")}</h3>
                <Badge>{e.status}</Badge>
                <p className="rm-note">
                  Attempts: {e.attempts} · Reference: {e.id}
                </p>
                {e.last_error && <p>{e.last_error}</p>}
                {e.status === "failed" && (
                  <ActionForm action={retryEmailAction} label="Queue retry">
                    <input type="hidden" name="id" value={e.id} />
                    <label className="app-checkbox">
                      <input name="confirm" type="checkbox" required />
                      <span>
                        I checked the delivery log and want to retry this
                        message.
                      </span>
                    </label>
                  </ActionForm>
                )}
              </article>
            ),
          )}
        </div>
        <p className="rm-note">Showing the oldest 50 unsent messages.</p>
      </section>
    </main>
  );
}
