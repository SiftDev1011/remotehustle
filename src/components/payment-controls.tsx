"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function PaymentControls({
  orderId,
  status,
  configured,
}: {
  orderId: string;
  status: string;
  configured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");

  async function call(kind: "start" | "check") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/payments/" + kind, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setMessage(
        result.state === "success" || result.paid
          ? "Payment confirmed."
          : result.state === "failed"
            ? "Payment was unsuccessful. You can retry."
            : "Payment is pending. If you have paid, allow time for confirmation and check again.",
      );
      router.refresh();
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to connect. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  if (status === "paid" || status === "refunded") return null;
  return (
    <div className="app-payment">
      <h3>
        {status === "failed" ? "Payment unsuccessful" : "Complete your payment"}
      </h3>
      <p className="rm-note">
        {status === "failed"
          ? "Your order is saved. Retry securely through Paystack."
          : "Pay securely through Paystack. If you have already paid, check the status before trying again."}
      </p>
      {configured ? (
        <div className="app-inline-links">
          <button
            disabled={busy}
            className="rm-btn"
            onClick={() => void call("start")}
          >
            {busy
              ? "Please wait…"
              : status === "failed"
                ? "Retry payment ↗"
                : "Continue to Paystack ↗"}
          </button>
          <button
            disabled={busy}
            className="rm-btn rm-btn-secondary"
            onClick={() => void call("check")}
          >
            Check payment status
          </button>
        </div>
      ) : (
        <p className="app-notice">
          Payments are temporarily unavailable. Your order is saved. Please try
          again shortly.
        </p>
      )}
      {message && (
        <p className="app-notice" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
