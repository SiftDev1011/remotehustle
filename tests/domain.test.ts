import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationGate,
  normalizePhone,
  safeNext,
  profileProgress,
  canManage,
  type Profile,
} from "../src/lib/domain";
import {
  validateCvMetadata,
  validateCvBytes,
} from "../src/lib/file-validation";
import { renderEmail } from "../src/lib/email/templates";
import { csvCell } from "../src/lib/csv";
import { paymentState } from "../src/lib/payments/types";
const profile: Profile = {
  user_id: "id",
  full_name: "Worker",
  email: "worker@example.test",
  phone: "+2348012345678",
  location_id: "location",
  category_id: "category",
  experience: "Work",
  education: "Education",
  linkedin_url: "https://example.test/profile",
  preferred_roles: ["Support"],
  employment_preferences: ["full-time"],
  interests: ["Remote work"],
  cv_id: "cv",
  terms_accepted_at: "2026-10-07",
  terms_version: "2026-10-07",
  marketing_consent: false,
  updated_at: "2026-10-07",
};
test("UI gates follow sign-in, verification, approval, completion", () => {
  const ready = {
    signedIn: true,
    verified: true,
    approval: "approved" as const,
    profile,
    skillCount: 1,
    cvReady: true,
  };
  assert.equal(applicationGate(ready), "ready");
  assert.equal(applicationGate({ ...ready, signedIn: false }), "sign-in");
  assert.equal(applicationGate({ ...ready, verified: false }), "verification");
  assert.equal(applicationGate({ ...ready, approval: "pending" }), "approval");
  assert.equal(applicationGate({ ...ready, approval: "inactive" }), "inactive");
  assert.equal(applicationGate({ ...ready, cvReady: false }), "profile");
  assert.equal(
    profileProgress({ ...profile, phone: null }, 1, true).percent,
    92,
  );
});
test("phone numbers are normalised before uniqueness checks", () => {
  assert.equal(normalizePhone("0801 234 5678"), "+2348012345678");
  assert.equal(normalizePhone("2348012345678"), "+2348012345678");
  assert.throws(() => normalizePhone("1234"));
});
test("redirects reject external and encoded protocol-relative paths", () => {
  for (const bad of [
    "https://attacker.test",
    "//attacker.test",
    "/%2fattacker.test",
    "/\\attacker.test",
    "/%5cattacker.test",
    "/%0aevil",
    "%%%",
  ])
    assert.equal(safeNext(bad), "/workspace");
  assert.equal(safeNext("/jobs/abc?q=1"), "/jobs/abc?q=1");
});
test("file extensions, MIME, size and signature are enforced", () => {
  assert.throws(() => validateCvMetadata("cv.exe", "application/pdf", 100));
  assert.throws(() =>
    validateCvMetadata("cv.pdf", "application/pdf", 10485761),
  );
  assert.throws(() => validateCvMetadata("cv.pdf", "text/html", 100));
  const pdf = new TextEncoder().encode("%PDF-1.7 example");
  validateCvBytes(pdf, "cv.pdf", "application/pdf", pdf.length);
  assert.throws(() =>
    validateCvBytes(
      new TextEncoder().encode("<script>"),
      "cv.pdf",
      "application/pdf",
      8,
    ),
  );
  assert.throws(() =>
    validateCvBytes(pdf, "cv.pdf", "application/pdf", pdf.length + 1),
  );
});
test("HTML email escapes user and employer text", () => {
  const mail = renderEmail(
    "application-status",
    "<img src=x>",
    { job_title: "<script>alert(1)</script>", status: "shortlisted" },
    "https://example.test",
  );
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;script&gt;"));
  assert.ok(!mail.html.includes("<img src=x>"));
});
test("admin areas never grant inactive memberships access", () => {
  const admin = {
    user_id: "id",
    role: "admin" as const,
    areas: ["jobs" as const],
    active: true,
  };
  assert.equal(canManage(admin, "jobs"), true);
  assert.equal(canManage(admin, "users"), false);
  assert.equal(canManage({ ...admin, active: false }, "jobs"), false);
});
test("CSV exports neutralise spreadsheet formulas", () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell("+2348012345678"), '"\'+2348012345678"');
});
test("unknown provider payment states remain pending", () => {
  assert.equal(paymentState("success"), "success");
  assert.equal(paymentState("failed"), "failed");
  assert.equal(paymentState("processing"), "pending");
  assert.equal(paymentState("unexpected"), "pending");
});
