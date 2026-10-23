const groups: Record<string, string[]> = {
  Accounts: [
    "APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  "Private files": [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_PRIVATE_BUCKET",
  ],
  "Public images": ["R2_PUBLIC_BUCKET", "R2_PUBLIC_BASE_URL"],
  "Transactional email": ["BREVO_API_KEY", "EMAIL_FROM_ADDRESS"],
  "Scheduled jobs": ["CRON_SECRET"],
  Payments: ["PAYMENT_PROVIDER", "PAYSTACK_SECRET_KEY"],
  "Contact and bot protection": [
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "CONTACT_RATE_SECRET",
  ],
  "Legal details": ["LEGAL_OPERATOR_NAME", "PRIVACY_CONTACT_EMAIL"],
};
if (process.env.AI_HELPER_ENABLED === "true")
  groups["AI website helper"] = [
    "OPENAI_API_KEY",
    "OPENAI_HELPER_MODEL",
    "HELPER_RATE_SECRET",
  ];
let missing = false;
if (
  process.env.AI_HELPER_ENABLED === "true" &&
  (process.env.HELPER_RATE_SECRET?.length || 0) < 32
) {
  console.log("HELPER_RATE_SECRET needs at least 32 characters.");
  missing = true;
}
for (const [label, keys] of Object.entries(groups)) {
  const absent = keys.filter((key) => !process.env[key]?.trim());
  console.log(
    label +
      ": " +
      (absent.length ? "missing " + absent.join(", ") : "configured"),
  );
  if (absent.length) missing = true;
}
if (
  process.env.EMAIL_FROM_ADDRESS &&
  /@(gmail|googlemail)\.com$/i.test(process.env.EMAIL_FROM_ADDRESS)
) {
  console.log("Use your verified domain sender for Brevo, as agreed.");
  missing = true;
}
if (process.env.CRON_SECRET && process.env.CRON_SECRET.length < 32) {
  console.log("CRON_SECRET needs at least 32 characters.");
  missing = true;
}
if ((process.env.CONTACT_RATE_SECRET || "").length < 32) {
  console.log("CONTACT_RATE_SECRET needs at least 32 characters.");
  missing = true;
}
if (process.env.SITE_INDEXING_ENABLED !== "true")
  console.log(
    "Search indexing is disabled. Enable it only when production is ready.",
  );
if (process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_"))
  console.log("Paystack is in test mode. Do not announce live sales yet.");
try {
  const url = new URL(process.env.APP_URL || "");
  if (!["https:", "http:"].includes(url.protocol)) throw new Error();
  if (url.hostname !== "localhost" && url.protocol !== "https:") {
    console.log("Use HTTPS for the public APP_URL.");
    missing = true;
  }
} catch {
  console.log("APP_URL must be a valid full URL.");
  missing = true;
}
console.log(
  "This checks variable presence only. It does not validate credentials or send emails.",
);
process.exitCode = missing ? 1 : 0;
