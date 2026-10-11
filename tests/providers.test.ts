import { test, afterEach } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { paystack, validPaystackSignature } from "../src/lib/payments/paystack";
import { assetExtension } from "../src/lib/storage/assets";
import { minorAmount } from "../src/lib/management";
import { renderEmail } from "../src/lib/email/templates";
const originalFetch = globalThis.fetch,
  originalSecret = process.env.PAYSTACK_SECRET_KEY;
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalSecret === undefined) delete process.env.PAYSTACK_SECRET_KEY;
  else process.env.PAYSTACK_SECRET_KEY = originalSecret;
});
function mock(responses: unknown[]) {
  process.env.PAYSTACK_SECRET_KEY = "test-only-secret";
  const calls: { url: string; init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => {
    calls.push({ url: String(input), init });
    const result = responses.shift();
    if (result instanceof Error) throw result;
    return new Response(JSON.stringify({ status: true, data: result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return calls;
}
test("gateway initialization sends server amount, preserves the reference and validates the checkout host", async () => {
  const calls = mock([
    {
      reference: "rh-test",
      authorization_url: "https://checkout.paystack.com/test",
    },
  ]);
  const intent = {
    reference: "rh-test",
    email: "buyer@example.test",
    amountMinor: 250000,
    currency: "NGN",
    callbackUrl: "https://example.test/api/payments/callback",
  };
  const result = await paystack.initialise(intent);
  assert.equal(result.reference, "rh-test");
  assert.equal(JSON.parse(String(calls[0].init?.body)).amount, 250000);
  assert.equal(calls[0].url, "https://api.paystack.co/transaction/initialize");
  mock([
    {
      reference: "other",
      authorization_url: "https://checkout.paystack.com/test",
    },
  ]);
  await assert.rejects(paystack.initialise(intent), /reference did not match/);
  mock([
    {
      reference: "rh-test",
      authorization_url: "https://untrusted.example/test",
    },
  ]);
  await assert.rejects(paystack.initialise(intent), /Invalid payment URL/);
});
test("verification refuses mismatched references and treats unknown states as pending", async () => {
  mock([
    {
      reference: "rh-test",
      status: "processing",
      amount: 250000,
      currency: "NGN",
    },
  ]);
  assert.equal((await paystack.verify("rh-test")).state, "pending");
  mock([
    { reference: "wrong", status: "success", amount: 250000, currency: "NGN" },
  ]);
  await assert.rejects(paystack.verify("rh-test"), /Invalid payment response/);
});
test("refund adapter handles numeric transaction IDs using a verified transaction lookup", async () => {
  const calls = mock([
    {
      id: 81,
      transaction: 9001,
      amount: 250000,
      currency: "NGN",
      status: "processed",
    },
    { reference: "rh-test" },
  ]);
  const result = await paystack.verifyRefund("81");
  assert.deepEqual(result, {
    id: "81",
    reference: "rh-test",
    amountMinor: 250000,
    currency: "NGN",
    state: "processed",
  });
  assert.equal(calls[1].url, "https://api.paystack.co/transaction/9001");
});
test("refund timeouts surface an uncertain result and never automatically POST a second refund", async () => {
  const calls = mock([new Error("timeout")]);
  await assert.rejects(
    paystack.refund("rh-test", 250000, "Approved"),
    /timeout/,
  );
  assert.equal(calls.length, 1);
});
test("webhook authentication checks raw bytes and rejects altered or malformed signatures", () => {
  process.env.PAYSTACK_SECRET_KEY = "test-only-secret";
  const raw = Buffer.from('{"event":"charge.success"}');
  const signature = createHmac("sha512", "test-only-secret")
    .update(raw)
    .digest("hex");
  assert.equal(validPaystackSignature(raw, signature), true);
  assert.equal(
    validPaystackSignature(Buffer.from("different"), signature),
    false,
  );
  assert.equal(validPaystackSignature(raw, "invalid"), false);
});
test("media uploads enforce type-specific limits and money parsing avoids floating point multiplication", () => {
  assert.equal(assetExtension("image", "image/png", 1024), "png");
  assert.equal(
    assetExtension("digital", "application/zip", 50 * 1024 * 1024),
    "zip",
  );
  assert.throws(() => assetExtension("image", "image/svg+xml", 1024), /Choose/);
  assert.throws(
    () => assetExtension("image", "image/jpeg", 6 * 1024 * 1024),
    /Choose/,
  );
  assert.throws(
    () => assetExtension("digital", "application/pdf", 51 * 1024 * 1024),
    /Choose/,
  );
  assert.equal(minorAmount("12.34"), 1234);
  assert.equal(minorAmount("0.29"), 29);
  assert.throws(() => minorAmount("1.234"), /valid price/);
});
test("purchase emails point to the authenticated order, never expose private file keys", () => {
  const orderId = "00000000-0000-4000-8000-000000000001";
  const email = renderEmail(
    "download-link",
    "Buyer",
    { order_id: orderId, object_key: "digital/private.pdf" },
    "https://example.test",
  );
  assert.ok(email.html.includes("/workspace/orders/" + orderId));
  assert.ok(!email.html.includes("private.pdf"));
  assert.ok(
    !renderEmail(
      "download-link",
      "Buyer",
      { order_id: "https://evil.example" },
      "https://example.test",
    ).html.includes("evil.example"),
  );
});
