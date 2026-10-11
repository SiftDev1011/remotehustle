export type PaymentState = "success" | "failed" | "pending";
export interface PaymentIntent {
  reference: string;
  email: string;
  amountMinor: number;
  currency: string;
  callbackUrl: string;
}
export interface PaymentResult {
  reference: string;
  state: PaymentState;
  amountMinor: number;
  currency: string;
}
export interface RefundResult {
  id: string;
  reference: string;
  amountMinor: number;
  currency: string;
  state: string;
}
export interface PaymentGateway {
  initialise(
    intent: PaymentIntent,
  ): Promise<{ reference: string; checkoutUrl: string }>;
  verify(reference: string): Promise<PaymentResult>;
  refund(
    reference: string,
    amountMinor: number,
    note: string,
  ): Promise<RefundResult>;
  verifyRefund(id: string): Promise<RefundResult>;
}
export function paymentState(status: string): PaymentState {
  if (status === "success") return "success";
  if (["failed", "abandoned", "reversed"].includes(status)) return "failed";
  return "pending";
}
