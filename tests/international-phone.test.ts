import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeInternationalPhone,
  PHONE_COUNTRIES,
  initialPhone,
  pastedPhoneCountry,
} from "../src/lib/international-phone";
import { signupSchema } from "../src/lib/validation";
import { normalizePhone } from "../src/lib/domain";
test("country list includes Botswana, India, Nigeria and shared calling codes", () => {
  for (const [code, dial] of [
    ["BW", "+267"],
    ["IN", "+91"],
    ["NG", "+234"],
    ["US", "+1"],
    ["CA", "+1"],
  ])
    assert.equal(PHONE_COUNTRIES.find((c) => c.code === code)?.dialCode, dial);
  assert.equal(
    new Set(PHONE_COUNTRIES.map((c) => c.code)).size,
    PHONE_COUNTRIES.length,
  );
  assert.ok(PHONE_COUNTRIES.length > 200);
});
test("local international phone numbers canonicalise before account creation", () => {
  for (const [country, local, expected] of [
    ["BW", "71 234 567", "+26771234567"],
    ["IN", "98765 43210", "+919876543210"],
    ["NG", "0801 234 5678", "+2348012345678"],
    ["GB", "07700 900123", "+447700900123"],
    ["IT", "06 6982", "+39066982"],
    ["NU", "1234", "+6831234"],
  ]) {
    const phone = normalizeInternationalPhone(local, country);
    assert.equal(phone, expected);
    assert.equal(normalizePhone(phone), phone);
    assert.equal(
      signupSchema.safeParse({
        full_name: "Test Person",
        email: "test+country@example.test",
        phone,
        password: "long-enough-password",
        consent: true,
        marketing_consent: false,
      }).success,
      true,
    );
  }
});
test("pasting full numbers never doubles their prefix and restores country on prefill", () => {
  assert.equal(
    normalizeInternationalPhone("+91 98765 43210", "NG"),
    "+919876543210",
  );
  assert.equal(
    normalizeInternationalPhone("0091 98765 43210", "BW"),
    "+919876543210",
  );
  assert.equal(pastedPhoneCountry("+26771234567"), "BW");
  assert.deepEqual(initialPhone("+919876543210"), {
    country: "IN",
    number: "9876543210",
  });
  assert.deepEqual(initialPhone(""), { country: "NG", number: "" });
});
test("invalid lengths, extensions, text and unsupported countries are rejected", () => {
  for (const number of [
    "123",
    "phone +919876543210",
    "+919876543210 ext 42",
    "++919876543210",
    "+919876543210999999",
    "",
  ])
    assert.throws(() => normalizeInternationalPhone(number, "IN"));
  assert.throws(() => normalizeInternationalPhone("9876543210", "ZZ"));
});
