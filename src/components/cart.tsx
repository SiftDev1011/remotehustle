"use client";
import { Disclosure } from "@/components/disclosure";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Product, CartItem } from "@/lib/commerce";
import { money } from "@/lib/management";
const key = "remote-hustle-cart-v1";
function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed)
      ? parsed
          .filter(
            (x) =>
              typeof x.id === "string" &&
              Number.isInteger(x.quantity) &&
              x.quantity >= 1 &&
              x.quantity <= 10,
          )
          .slice(0, 20)
      : [];
  } catch {
    return [];
  }
}
function writeCart(items: CartItem[]) {
  localStorage.setItem(key, JSON.stringify(items));
  window.dispatchEvent(new Event("rh-cart-change"));
}
export function AddToCart({
  product,
  buyNow = false,
}: {
  product: Product;
  buyNow?: boolean;
}) {
  const router = useRouter();
  const [added, setAdded] = useState(false),
    [error, setError] = useState("");
  return (
    <div>
      <button
        className="rm-btn"
        onClick={() => {
          try {
            const items = readCart(),
              existing = items.find((x) => x.id === product.id);
            if (existing) existing.quantity = 1;
            else {
              if (items.length >= 20) {
                setError("Your cart holds up to 20 products.");
                return;
              }
              items.push({ id: product.id, quantity: 1 });
            }
            writeCart(items);
            setAdded(true);
            if (buyNow) router.push("/cart");
            setError("");
          } catch {
            setError("Allow browser storage to use your cart.");
          }
        }}
      >
        {buyNow
          ? "Continue to checkout"
          : added
            ? "Added to cart ✓"
            : "Add to cart"}
      </button>
      {added && (
        <Link className="rm-text-link app-inline-link" href="/cart">
          View cart
        </Link>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
export function CartCount({
  variant = "nav",
}: {
  variant?: "nav" | "button" | "floating";
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const update = () =>
      setCount(readCart().reduce((s, x) => s + x.quantity, 0));
    update();
    window.addEventListener("rh-cart-change", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("rh-cart-change", update);
      window.removeEventListener("storage", update);
    };
  }, []);
  if (variant === "floating" && count === 0) return null;
  return (
    <Link
      href="/cart"
      className={`app-cart-indicator app-cart-${variant}${variant === "button" ? " rm-btn rm-btn-secondary" : ""}`}
      aria-label={`Shopping cart, ${count} ${count === 1 ? "item" : "items"}`}
    >
      {variant === "floating" ? (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6H18a2 2 0 0 0 2-1.6L21 7H6" />
          <circle cx="10" cy="21" r="1" />
          <circle cx="18" cy="21" r="1" />
        </svg>
      ) : variant === "button" ? (
        "View cart"
      ) : (
        "Your cart"
      )}
      {count > 0 && (
        <span className="app-cart-badge" key={count} aria-hidden="true">
          {count}
        </span>
      )}
      <span className="app-visually-hidden" role="status" aria-atomic="true">
        {count} {count === 1 ? "item" : "items"} in cart
      </span>
    </Link>
  );
}

export function Cart({
  products,
  gate,
  policies,
}: {
  products: Product[];
  gate: { message: string; href: string } | null;
  policies: Record<string, string>;
}) {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[] | null>(null),
    [code, setCode] = useState(""),
    [discount, setDiscount] = useState(0),
    [applied, setApplied] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [requestKey, setRequestKey] = useState("");
  useEffect(() => {
    setItems(readCart());
    setRequestKey(crypto.randomUUID());
  }, []);
  function change(next: CartItem[]) {
    try {
      writeCart(next);
      setItems(next);
      setDiscount(0);
      setApplied("");
      setRequestKey(crypto.randomUUID());
    } catch {
      setError("Allow browser storage to update your cart.");
    }
  }
  if (items === null) return <p role="status">Loading your cart…</p>;
  const rows = items.map((item) => ({
    item,
    product: products.find((p) => p.id === item.id && p.type === "digital"),
  }));
  const unavailable = rows.some((x) => !x.product);
  const subtotal = rows.reduce(
    (s, x) => s + (x.product?.price_minor || 0) * x.item.quantity,
    0,
  );
  async function applyCode() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/cart/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setDiscount(result.discount);
      setApplied(code.trim().toUpperCase());
      setRequestKey(crypto.randomUUID());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to apply code.");
      setDiscount(0);
      setApplied("");
    } finally {
      setBusy(false);
    }
  }
  async function checkout(form: FormData) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestKey,
          items,
          code: applied,
          consent: form.get("consent") === "on",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      writeCart([]);
      router.push("/workspace/orders/" + data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create your order.");
      setBusy(false);
    }
  }
  if (!items.length)
    return (
      <div className="app-empty">
        <h2>Your cart is waiting.</h2>
        <p>Explore the resources available for your next step.</p>
        <Link className="rm-btn" href="/shop">
          Explore the shop
        </Link>
      </div>
    );
  return (
    <div className="app-checkout-grid">
      <div>
        <div className="app-record-list">
          {rows.map(({ item, product }) => (
            <article className="app-card app-cart-row" key={item.id}>
              {product?.image_url && (
                <img src={product.image_url} alt="" width={88} height={88} />
              )}
              <div>
                <h3>
                  {product?.name || "This product is no longer available"}
                </h3>
                <p>
                  {product
                    ? money(product.price_minor)
                    : "Please remove it before continuing."}
                </p>
                <button
                  className="rm-text-link"
                  onClick={() => change(items.filter((x) => x.id !== item.id))}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </div>
        <div className="app-card app-section">
          <label className="app-field">
            Have a code?
            <input
              value={code}
              maxLength={32}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter discount code"
            />
          </label>
          <button
            type="button"
            className="rm-btn rm-btn-secondary"
            disabled={busy || !code.trim()}
            onClick={() => void applyCode()}
          >
            Apply code
          </button>
          {applied && (
            <p role="status">
              {applied} applied.{" "}
              <button
                className="rm-text-link"
                onClick={() => {
                  setApplied("");
                  setDiscount(0);
                  setCode("");
                  setRequestKey(crypto.randomUUID());
                }}
              >
                Remove code
              </button>
            </p>
          )}
        </div>
      </div>
      <form className="app-card app-order-summary" action={checkout}>
        <h2>Your order</h2>
        <p className="rm-note">
          Digital downloads only. No shipping fees. Your files become available
          after payment is confirmed.
        </p>
        <dl>
          <div>
            <dt>Products</dt>
            <dd>{money(subtotal)}</dd>
          </div>
          <div>
            <dt>Discount{applied ? " · " + applied : ""}</dt>
            <dd>−{money(discount)}</dd>
          </div>
          <div className="app-total">
            <dt>Total</dt>
            <dd>{money(Math.max(0, subtotal - discount))}</dd>
          </div>
        </dl>
        <fieldset disabled={busy} className="app-form-fields">
          {policies.refund_policy && (
            <Disclosure label="Purchase support and downloads">
              <p className="app-preline rm-note">{policies.refund_policy}</p>
            </Disclosure>
          )}
          <label className="app-check">
            <input type="checkbox" name="consent" required />
            <span>
              I agree to the <Link href="/terms">terms</Link> and the purchase
              support and download policy.
            </span>
          </label>
          {gate ? (
            <div className="app-notice">
              <p>{gate.message}</p>
              <Link href={gate.href} className="rm-text-link">
                Continue
              </Link>
            </div>
          ) : !policies.refund_policy ? (
            <p className="app-notice">
              Checkout is temporarily unavailable. Please try again later.
            </p>
          ) : (
            <button
              type="submit"
              className="rm-btn"
              disabled={unavailable || busy}
            >
              {busy ? "Creating your order…" : "Review & pay"}
            </button>
          )}
        </fieldset>
        {error && (
          <p className="app-form-error" role="alert">
            {error}
          </p>
        )}
        <p className="rm-note">Your final total is checked before payment.</p>
      </form>
    </div>
  );
}
