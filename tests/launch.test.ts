import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyContactCaptcha, authCaptcha } from "../src/lib/captcha";
import { contactSchema } from "../src/lib/contact";
test("contact CAPTCHA requires a valid action and hostname, fails closed in production and on outages", async () => {
  const saved = { ...process.env },
    original = globalThis.fetch;
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      APP_URL: "https://remotehustle.plug99com.ng",
      TURNSTILE_SECRET_KEY: "secret",
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: "site",
    });
    const result = {
      success: true,
      action: "contact",
      hostname: "remotehustle.plug99com.ng",
    };
    globalThis.fetch = async () =>
      new Response(JSON.stringify(result), { status: 200 });
    assert.equal(await verifyContactCaptcha("valid"), true);
    result.hostname = "attacker.test";
    assert.equal(await verifyContactCaptcha("valid"), false);
    result.hostname = "remotehustle.plug99com.ng";
    result.action = "auth";
    assert.equal(await verifyContactCaptcha("valid"), false);
    assert.equal(await verifyContactCaptcha(""), false);
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal(await verifyContactCaptcha("valid"), false);
    delete process.env.TURNSTILE_SECRET_KEY;
    assert.equal(await verifyContactCaptcha("valid"), false);
    assert.throws(() => authCaptcha(new FormData()), /security check/);
  } finally {
    globalThis.fetch = original;
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
test("contact validation rejects omitted consent, long messages and invalid addresses", () => {
  const valid = {
    name: "Visitor",
    email: "visitor@example.test",
    subject: "An enquiry",
    message: "Please share details about the programme.",
    consent: true,
  };
  assert.equal(contactSchema.safeParse(valid).success, true);
  for (const invalid of [
    { ...valid, consent: false },
    { ...valid, email: "not-an-email" },
    { ...valid, message: "x".repeat(4001) },
  ])
    assert.equal(contactSchema.safeParse(invalid).success, false);
});

test("contact endpoint enforces origin, byte limits and CAPTCHA before service-only storage", async () => {
  const { POST } = await import("../src/app/api/contact/route");
  const { NextRequest } = await import("next/server");
  const saved = { ...process.env },
    original = globalThis.fetch;
  let writes = 0,
    rateLimited = false;
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      APP_URL: "https://remotehustle.plug99com.ng",
      TURNSTILE_SECRET_KEY: "secret",
      CONTACT_RATE_SECRET: "a".repeat(40),
      NEXT_PUBLIC_SUPABASE_URL: "https://project.example.test",
      SUPABASE_SERVICE_ROLE_KEY: "secret-service",
    });
    globalThis.fetch = async (input, init) => {
      if (String(input).includes("siteverify"))
        return new Response(
          JSON.stringify({
            success: true,
            action: "contact",
            hostname: "remotehustle.plug99com.ng",
          }),
        );
      assert.ok(String(input).endsWith("/rest/v1/rpc/submit_contact"));
      writes++;
      const body = JSON.parse(String(init?.body));
      assert.ok(
        body.p_fingerprints.every((h: string) => /^[a-f0-9]{64}$/.test(h)),
      );
      return rateLimited
        ? new Response(
            JSON.stringify({ message: "CONTACT_RATE_LIMIT", code: "P0001" }),
            { status: 400 },
          )
        : new Response(JSON.stringify("00000000-0000-4000-8000-000000000111"));
    };
    const payload = {
      name: "Visitor",
      email: "visitor@example.test",
      subject: "A question",
      message: "Please send programme details.",
      consent: true,
      captcha_token: "token",
    };
    const request = (body: unknown, origin = process.env.APP_URL!) =>
      new NextRequest(process.env.APP_URL + "/api/contact", {
        method: "POST",
        headers: { origin, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    assert.equal(
      (await POST(request(payload, "https://attacker.test"))).status,
      403,
    );
    assert.equal(writes, 0);
    assert.equal(
      (await POST(request({ ...payload, message: "x".repeat(21000) }))).status,
      413,
    );
    assert.equal(writes, 0);
    assert.equal(
      (await POST(request({ ...payload, captcha_token: "" }))).status,
      400,
    );
    assert.equal(writes, 0);
    assert.equal((await POST(request(payload))).status, 200);
    assert.equal(writes, 1);
    rateLimited = true;
    assert.equal((await POST(request(payload))).status, 429);
  } finally {
    globalThis.fetch = original;
    for (const k of Object.keys(process.env))
      if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
});
