import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { requireArea } from "@/lib/auth";
import { idSchema } from "@/lib/validation";
import {
  Breadcrumbs,
  PageHeading,
  EmptyState,
  Badge,
  Select,
  Input,
  TextArea,
} from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import {
  reviewRefundAction,
  processRefundAction,
  checkRefundAction,
} from "@/actions/orders";
import { money } from "@/lib/management";
export default async function Refunds({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; status?: string; page?: string }>;
}) {
  const context = await requireArea("orders"),
    query = await searchParams,
    page = Math.max(0, Math.min(10000, Math.floor(Number(query.page) || 0)));
  let request = context.db
    .from("refund_requests")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * 30, page * 30 + 29);
  if (idSchema.safeParse(query.order).success)
    request = request.eq("order_id", query.order);
  if (
    [
      "requested",
      "approved",
      "rejected",
      "processing",
      "refunded",
      "failed",
      "needs_review",
    ].includes(query.status || "")
  )
    request = request.eq("status", query.status);
  if (query.status === "attention")
    request = request.in("status", [
      "requested",
      "approved",
      "needs_review",
      "failed",
    ]);
  const { data, error, count } = await request;
  if (error) throw new Error("Unable to load refunds.");
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Orders", href: "/admin/orders" },
          { label: "Payment corrections" },
        ]}
      />
      <PageHeading
        title="Payment corrections"
        description="Approval and returning funds are separate steps. Uncertain provider responses require reconciliation before any further action."
      />
      <form className="app-filter-bar">
        <Dropdown
          name="status"
          aria-label="Refund status"
          defaultValue={query.status || ""}
        >
          <option value="">All statuses</option>
          <option value="attention">Needs attention</option>
          {[
            "requested",
            "approved",
            "rejected",
            "processing",
            "refunded",
            "failed",
            "needs_review",
          ].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </Dropdown>
        <button className="rm-btn">Filter</button>
      </form>
      {data?.length ? (
        <div className="app-record-list">
          {data.map((r) => (
            <article className="app-card" key={r.id}>
              <Badge>
                {r.status.replaceAll("_", " ")} · {r.kind}
              </Badge>
              <h3>
                {money(r.amount_minor)}{" "}
                <Link href={"/admin/orders/" + r.order_id}>
                  Order {r.order_id.slice(0, 8).toUpperCase()}
                </Link>
              </h3>
              <p className="app-preline">{r.reason}</p>
              <p className="rm-note app-wrap">Payment: {r.payment_reference}</p>
              {r.admin_note && (
                <p className="app-preline rm-note">{r.admin_note}</p>
              )}
              {r.status === "requested" && (
                <ActionForm action={reviewRefundAction} label="Save decision">
                  <input type="hidden" name="id" value={r.id} />
                  <Select name="decision" label="Decision">
                    <option value="approved">Approve</option>
                    <option value="rejected">Reject</option>
                  </Select>
                  <TextArea
                    name="note"
                    label="Decision note visible to the customer"
                    minLength={3}
                    maxLength={2000}
                    required
                  />
                </ActionForm>
              )}
              {r.status === "approved" && (
                <ActionForm
                  action={processRefundAction}
                  label="Submit refund to Paystack"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <label className="app-check">
                    <input type="checkbox" name="confirm" required />
                    Refund {money(r.amount_minor)} to this payment.
                  </label>
                </ActionForm>
              )}
              {["processing", "needs_review", "failed"].includes(r.status) && (
                <ActionForm
                  action={checkRefundAction}
                  label="Check refund status"
                >
                  <input type="hidden" name="id" value={r.id} />
                  {r.provider_id ? (
                    <p>Paystack refund ID: {r.provider_id}</p>
                  ) : (
                    <Input
                      name="provider_id"
                      label="Refund ID from the Paystack dashboard"
                      required
                      pattern="[0-9]+"
                    />
                  )}
                  {r.status === "failed" && (
                    <p className="rm-note">
                      Resolve the failed refund with Paystack, then check its
                      status here. This form never sends another refund.
                    </p>
                  )}
                </ActionForm>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="No matching refund requests." />
      )}
      <div className="app-inline-links">
        {page > 0 && (
          <Link
            href={
              "?page=" +
              (page - 1) +
              "&status=" +
              encodeURIComponent(query.status || "") +
              "&order=" +
              encodeURIComponent(query.order || "")
            }
          >
            Previous
          </Link>
        )}
        {(count || 0) > (page + 1) * 30 && (
          <Link
            href={
              "?page=" +
              (page + 1) +
              "&status=" +
              encodeURIComponent(query.status || "") +
              "&order=" +
              encodeURIComponent(query.order || "")
            }
          >
            Next
          </Link>
        )}
      </div>
    </main>
  );
}
