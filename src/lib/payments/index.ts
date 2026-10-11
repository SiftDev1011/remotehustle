import "server-only";
import { paystack } from "./paystack";
import type { PaymentGateway } from "./types";
// Application code uses this interface; provider-specific calls stay in the adapter.
export function paymentGateway(): PaymentGateway {
  if ((process.env.PAYMENT_PROVIDER || "paystack") !== "paystack")
    throw new Error("The selected payment provider is not implemented.");
  return paystack;
}
