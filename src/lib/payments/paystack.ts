import "server-only";
import { requiredEnv } from "@/lib/env";
import {
  paymentState,
  type PaymentGateway,
  type PaymentIntent,
  type RefundResult,
  type PaymentResult,
} from "./types";
import { createHmac, timingSafeEqual } from "node:crypto";
async function request(path: string, body?: unknown) {
  const response = await fetch("https://api.paystack.co" + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + requiredEnv("PAYSTACK_SECRET_KEY"),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const data = await response.json();
  if (!response.ok || data.status !== true)
    throw new Error("Payment provider request failed.");
  return data.data;
}
export const paystack: PaymentGateway = {
  async initialise(intent: PaymentIntent) {
    if (!Number.isSafeInteger(intent.amountMinor) || intent.amountMinor <= 0)
      throw new Error("Invalid payment amount.");
    const data = await request("/transaction/initialize", {
      reference: intent.reference,
      email: intent.email,
      amount: intent.amountMinor,
      currency: intent.currency,
      callback_url: intent.callbackUrl,
    });
    if (data.reference !== intent.reference)
      throw new Error("Payment reference did not match.");
    const url = new URL(data.authorization_url);
    if (url.protocol !== "https:" || url.hostname !== "checkout.paystack.com")
      throw new Error("Invalid payment URL.");
    return { reference: intent.reference, checkoutUrl: url.href };
  },
  async verify(reference: string): Promise<PaymentResult> {
    const data = await request(
      "/transaction/verify/" + encodeURIComponent(reference),
    );
    if (
      data.reference !== reference ||
      !Number.isSafeInteger(data.amount) ||
      typeof data.currency !== "string"
    )
      throw new Error("Invalid payment response.");
    return {
      reference: data.reference,
      state: paymentState(data.status),
      amountMinor: data.amount,
      currency: data.currency,
    };
  },
  async refund(reference: string, amountMinor: number, note: string) {
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0)
      throw new Error("Invalid refund amount.");
    const data = await request("/refund", {
      transaction: reference,
      amount: amountMinor,
      currency: "NGN",
      merchant_note: note.slice(0, 500),
    });
    return refundResult(data);
  },
  async verifyRefund(id: string) {
    if (!/^[0-9]+$/.test(id)) throw new Error("Invalid refund identifier.");
    const data = await request("/refund/" + id);
    if (String(data.id) !== id)
      throw new Error("Refund identifier did not match.");
    return refundResult(data);
  },
};
async function refundResult(
  data: Record<string, unknown>,
): Promise<RefundResult> {
  const transaction = data.transaction;
  let reference: string;
  if (
    transaction &&
    typeof transaction === "object" &&
    "reference" in transaction
  )
    reference = String(transaction.reference);
  else {
    if (!/^[0-9]+$/.test(String(transaction)))
      throw new Error("Invalid refund transaction.");
    const tx = await request("/transaction/" + String(transaction));
    reference = tx.reference;
  }
  if (
    !/^[0-9]+$/.test(String(data.id)) ||
    typeof reference !== "string" ||
    !Number.isSafeInteger(data.amount) ||
    typeof data.currency !== "string" ||
    typeof data.status !== "string"
  )
    throw new Error("Invalid refund response.");
  return {
    id: String(data.id),
    reference,
    amountMinor: Number(data.amount),
    currency: data.currency,
    state: data.status,
  };
}
export function validPaystackSignature(rawBody: Buffer, signature: string) {
  if (!/^[a-f0-9]{128}$/i.test(signature)) return false;
  const expected = createHmac("sha512", requiredEnv("PAYSTACK_SECRET_KEY"))
    .update(rawBody)
    .digest();
  const supplied = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, supplied);
}
