import { Disclosure } from "./disclosure";
import Link from "next/link";
import type { Order, OrderItem, Refund, PurchaseIssue } from "@/lib/commerce";
import { money } from "@/lib/management";
import { Badge, TextArea, Select } from "./ui";
import { PaymentControls } from "./payment-controls";
import { ActionForm } from "./action-form";
import { reportPurchaseIssueAction } from "@/actions/orders";
export function OrderDetail({
  order,
  items,
  refunds,
  issues,
  admin = false,
}: {
  order: Order;
  items: OrderItem[];
  refunds: Refund[];
  issues: PurchaseIssue[];
  admin?: boolean;
}) {
  const ownRefund = refunds.find((r) => r.kind === "customer");
  const blocked =
    ownRefund &&
    ["approved", "processing", "needs_review", "refunded"].includes(
      ownRefund.status,
    );
  return (
    <>
      <div className="app-inline-links">
        <Badge>
          {order.payment_status === "paid"
            ? "Payment confirmed"
            : order.payment_status === "failed"
              ? "Payment failed"
              : order.payment_status === "refunded"
                ? "Refunded"
                : "Awaiting payment"}
        </Badge>
        {order.has_physical && (
          <Badge>Delivery · {order.fulfillment_status}</Badge>
        )}
      </div>
      <div className="app-checkout-grid">
        <div className="app-record-list">
          {items.map((item) => (
            <article className="app-card" key={item.id}>
              <span className="rm-eyebrow">{item.type}</span>
              <h3>{item.name}</h3>
              <p>
                {item.quantity} × {money(item.unit_minor)}
              </p>
              {!admin &&
                item.type === "digital" &&
                (order.payment_status === "paid" && !blocked ? (
                  <a className="rm-btn" href={"/api/downloads/" + item.id}>
                    Download ↗
                  </a>
                ) : (
                  <p className="rm-note">
                    {blocked || order.payment_status === "refunded"
                      ? "Download access is unavailable for this refund."
                      : "Your download will be available after payment is confirmed."}
                  </p>
                ))}
            </article>
          ))}
        </div>
        <aside className="app-card app-order-summary">
          <h2>Order summary</h2>
          <dl>
            <div>
              <dt>Products</dt>
              <dd>{money(order.subtotal_minor)}</dd>
            </div>
            <div>
              <dt>
                Discount{order.discount_code ? " · " + order.discount_code : ""}
              </dt>
              <dd>−{money(order.discount_minor)}</dd>
            </div>
            {order.has_physical && (
              <div>
                <dt>Delivery</dt>
                <dd>{money(order.shipping_minor)}</dd>
              </div>
            )}
            <div className="app-total">
              <dt>Total</dt>
              <dd>{money(order.total_minor)}</dd>
            </div>
          </dl>
          <p className="rm-note">
            Placed{" "}
            {new Date(order.created_at).toLocaleDateString("en-NG", {
              dateStyle: "long",
              timeZone: "UTC",
            })}
          </p>
          {admin && (
            <p className="rm-note">Receipt email: {order.receipt_email}</p>
          )}
          {order.shipping_address && (
            <>
              <h3>Deliver to</h3>
              <address className="rm-note app-preline">
                {["name", "line1", "city", "state", "country", "phone"]
                  .map((key) => order.shipping_address?.[key])
                  .filter(Boolean)
                  .join("\n")}
              </address>
              <p className="rm-note">{order.shipping_name}</p>
              {order.tracking_note && (
                <p className="app-preline">{order.tracking_note}</p>
              )}
            </>
          )}
        </aside>
      </div>
      {!admin && (
        <PaymentControls
          orderId={order.id}
          status={order.payment_status}
          configured={Boolean(process.env.PAYSTACK_SECRET_KEY)}
        />
      )}
      {!admin && ownRefund && (
        <section className="app-card app-section">
          <h3>Refund · {ownRefund.status.replaceAll("_", " ")}</h3>
          <p className="app-preline">{ownRefund.reason}</p>
          {ownRefund.admin_note && (
            <p className="rm-note app-preline">{ownRefund.admin_note}</p>
          )}
        </section>
      )}
      {issues.length > 0 && (
        <section
          className="app-section app-record-list"
          aria-label="Purchase issues"
        >
          {issues.map((issue) => (
            <article className="app-card" key={issue.id}>
              <div className="app-card-header">
                <h3>Purchase issue · {issue.category}</h3>
                <Badge>{issue.status.replaceAll("_", " ")}</Badge>
              </div>
              <p className="app-preline">{issue.message}</p>
              {issue.admin_reply ? (
                <div className="app-issue-reply">
                  <strong>Reply from Remote Hustle</strong>
                  <p className="app-preline">{issue.admin_reply}</p>
                </div>
              ) : (
                <p className="rm-note">
                  The team will reply here after reviewing your report.
                </p>
              )}
              <p className="rm-note">
                Updated{" "}
                {new Date(issue.updated_at).toLocaleDateString("en-NG", {
                  timeZone: "UTC",
                })}
              </p>
              {admin && (
                <Link
                  className="rm-text-link"
                  href={
                    "/admin/purchase-issues?order=" + order.id + "&status=all"
                  }
                >
                  Manage purchase issues ↗
                </Link>
              )}
            </article>
          ))}
        </section>
      )}
      {!admin && !issues.some((issue) => issue.status !== "resolved") && (
        <Disclosure
          className="app-card app-section"
          label="Report a purchase issue"
        >
          <p className="rm-note">
            Trouble with a download, file or payment? Tell us what happened.
            Your report does not change your payment status or download access.
          </p>
          <ActionForm action={reportPurchaseIssueAction} label="Send issue">
            <input type="hidden" name="order_id" value={order.id} />
            <Select
              name="category"
              label="What went wrong?"
              required
              defaultValue="download"
            >
              <option value="download">Cannot access my download</option>
              <option value="file">Problem with the file</option>
              <option value="payment">Payment problem</option>
              <option value="other">Something else</option>
            </Select>
            <TextArea
              name="message"
              label="Describe the issue"
              minLength={5}
              maxLength={2000}
              required
            />
            <p className="rm-note">
              Do not include card details, passwords or other sensitive
              information.
            </p>
          </ActionForm>
        </Disclosure>
      )}
      {!admin && (
        <Link className="rm-text-link app-section" href="/shop">
          Continue exploring ↗
        </Link>
      )}
    </>
  );
}
