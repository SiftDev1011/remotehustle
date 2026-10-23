export type EmailKind =
  "welcome" | "application-status" | "order-confirmation" | "download-link";
export function escapeHtml(value: unknown) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function renderEmail(
  kind: EmailKind,
  name: string,
  payload: Record<string, unknown>,
  origin: string,
) {
  let heading = "",
    body = "",
    label = "",
    path = "/workspace";
  if (kind === "welcome") {
    heading = "Your REMOTE HUSTLE account is approved.";
    body =
      "Complete your professional profile, explore opportunities and make your next move.";
    label = "Open your workspace";
  } else if (kind === "application-status") {
    heading = "An update on your application.";
    body = `Your application for ${String(payload.job_title || "the role")} is now ${String(payload.status || "updated")}. You can view its status in your workspace.`;
    label = "View your applications";
    path = "/workspace/applications";
  } else if (kind === "order-confirmation") {
    heading = "Your order is confirmed.";
    body = `Payment for order ${String(payload.reference || "")} has been confirmed. Your order page contains the next steps.`;
    label = "View your order";
    path = "/workspace/orders";
    if (
      typeof payload.order_id === "string" &&
      /^[a-f0-9-]{36}$/.test(payload.order_id)
    )
      path += "/" + payload.order_id;
  } else {
    heading = "Your digital resources are ready.";
    body =
      "Sign in and open your order to download your files. If you need help, select Report a purchase issue on the order page.";
    label = "Open your downloads";
    path = "/workspace/orders";
    if (
      typeof payload.order_id === "string" &&
      /^[a-f0-9-]{36}$/.test(payload.order_id)
    )
      path += "/" + payload.order_id;
  }
  const href = new URL(path, origin).href;
  const text = `Hello ${name},\n\n${heading}\n\n${body}\n\n${label}: ${href}\n\nREMOTE HUSTLE`;
  const html = `<!doctype html><html><body style="margin:0;background:#f3f8fc;font-family:Arial,sans-serif;color:#122d46"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:36px 18px"><table role="presentation" width="560" style="max-width:100%;background:#fff;border:1px solid #d9e6ef;border-radius:12px" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 34px;font-size:22px;font-weight:bold"><img src="${escapeHtml(new URL("/brand-icon.png", origin).href)}" alt="" width="40" height="40" style="vertical-align:middle;margin-right:12px"/>REMOTE HUSTLE<span style="color:#245c85">.</span></td></tr><tr><td style="padding:0 34px 34px"><p style="font-size:14px;color:#536778">Hello ${escapeHtml(name)},</p><h1 style="font-family:Georgia,serif;font-size:32px;font-weight:normal;line-height:1.2">${escapeHtml(heading)}</h1><p style="font-size:15px;line-height:1.8;color:#536778">${escapeHtml(body)}</p><p style="margin:28px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#ffd65a;border-radius:24px;padding:14px 22px;text-decoration:none;color:#122d46;font-size:14px;font-weight:bold">${escapeHtml(label)}</a></p><p style="font-size:12px;line-height:1.7;color:#536778">You received this service email because of activity on your REMOTE HUSTLE account.</p></td></tr></table></td></tr></table></body></html>`;
  return { subject: heading, html, text };
}
