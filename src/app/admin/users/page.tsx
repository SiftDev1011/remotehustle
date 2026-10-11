import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { Breadcrumbs, PageHeading, EmptyState, Badge } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { approvalAction } from "@/actions/admin";
export default async function Workers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const context = await requireArea("users");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 150) : "";
  const approval = ["pending", "approved", "inactive"].includes(
    query.approval || "",
  )
    ? query.approval!
    : "";
  const page = Math.max(
    1,
    Math.min(10000, Number.parseInt(query.page || "1") || 1),
  );
  const { data, error } = await context.db.rpc("list_workers", {
    p_search: q,
    p_approval: approval,
    p_offset: (page - 1) * 50,
  });
  if (error) throw new Error("Unable to load workers.");
  const rows = (data || []) as {
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    approval: string;
    email_verified: boolean;
    total_count: number;
  }[];
  const total = Number(rows[0]?.total_count || 0);
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[{ label: "Admin", href: "/admin" }, { label: "Workers" }]}
      />
      <PageHeading title="Users" />
      <form className="rm-searchbar" action="/admin/users">
        <input
          className="app-search"
          name="q"
          aria-label="Search workers"
          placeholder="Name, email or phone"
          defaultValue={q}
        />
        <Dropdown
          name="approval"
          aria-label="Approval status"
          defaultValue={approval}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending approval</option>
          <option value="approved">Approved</option>
          <option value="inactive">Inactive</option>
        </Dropdown>
        <button className="rm-btn">Search</button>
      </form>
      <a className="rm-text-link" href="/api/admin/users/export">
        Export registration data (CSV) ↓
      </a>
      {rows.length ? (
        <div className="app-table-wrap">
          <table className="app-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Verification</th>
                <th>Account status</th>
                <th>Manage</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.user_id}>
                  <td>
                    <strong>{row.full_name || "Registration"}</strong>
                    <small>{row.email}</small>
                  </td>
                  <td>
                    <Badge>
                      {row.email_verified
                        ? "Email verified"
                        : "Unverified email"}
                    </Badge>
                  </td>
                  <td>
                    <ActionForm
                      action={approvalAction}
                      label="Update"
                      className="app-inline-form"
                    >
                      <input type="hidden" name="user_id" value={row.user_id} />
                      <Dropdown
                        aria-label={"Account status for " + row.full_name}
                        name="approval"
                        defaultValue={row.approval}
                      >
                        <option value="pending">Pending approval</option>
                        <option value="approved">Approved / active</option>
                        <option value="inactive">Inactive</option>
                      </Dropdown>
                    </ActionForm>
                  </td>
                  <td>
                    <Link
                      className="rm-text-link"
                      href={"/admin/users/" + row.user_id}
                    >
                      Open profile ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No workers match this view." />
      )}
      <div className="rm-actions app-pagination">
        {page > 1 && (
          <Link
            className="rm-btn rm-btn-light"
            href={
              "/admin/users?" +
              new URLSearchParams({ q, approval, page: String(page - 1) })
            }
          >
            Previous
          </Link>
        )}
        {page * 50 < total && (
          <Link
            className="rm-btn rm-btn-light"
            href={
              "/admin/users?" +
              new URLSearchParams({ q, approval, page: String(page + 1) })
            }
          >
            Next
          </Link>
        )}
      </div>
    </main>
  );
}
