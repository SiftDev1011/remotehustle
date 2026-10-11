export type Product = {
  id: string;
  category_id?: string | null;
  name: string;
  description: string;
  type: "digital" | "physical";
  price_minor: number;
  currency: string;
  image_url: string | null;
  active: boolean;
};
export type ShippingRate = {
  id: string;
  name: string;
  country: string;
  state: string;
  fee_minor: number;
  delivery_note: string;
  active: boolean;
};
export type CartItem = { id: string; quantity: number };
export type Order = {
  id: string;
  user_id: string | null;
  receipt_email: string;
  subtotal_minor: number;
  discount_minor: number;
  shipping_minor: number;
  total_minor: number;
  currency: string;
  discount_code: string | null;
  shipping_name: string | null;
  shipping_address: Record<string, string> | null;
  has_physical: boolean;
  payment_status: "pending" | "failed" | "paid" | "refunded";
  fulfillment_status: string;
  paid_reference: string | null;
  tracking_note: string;
  created_at: string;
  paid_at: string | null;
};
export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  name: string;
  type: "digital" | "physical";
  unit_minor: number;
  quantity: number;
  asset_id: string | null;
};
export type PaymentAttempt = {
  reference: string;
  order_id: string;
  amount_minor: number;
  currency: string;
  state: string;
  checkout_url: string | null;
  lease_until: string | null;
  created_at: string;
};
export type Refund = {
  id: string;
  order_id: string;
  payment_reference: string;
  kind: string;
  reason: string;
  status: string;
  admin_note: string;
  provider_id: string | null;
  amount_minor: number;
  created_at: string;
};

export type PurchaseIssue = {
  id: string;
  order_id: string;
  category: "download" | "file" | "payment" | "other";
  message: string;
  status: "open" | "in_review" | "resolved";
  admin_reply: string;
  created_at: string;
  updated_at: string;
};
