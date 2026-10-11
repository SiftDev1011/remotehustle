// Read-only checks. Does not register, pay, submit forms or change records.
const raw = process.argv[2] || process.env.APP_URL;
if (!raw) {
  console.error("Usage: npm run smoke-check -- https://your-domain");
  process.exit(1);
}
const origin = new URL(raw).origin;
let failed = 0;
for (const [path, expected] of [
  ["/", 200],
  ["/about", 200],
  ["/jobs", 200],
  ["/programs", 200],
  ["/shop", 200],
  ["/privacy", 200],
  ["/terms", 200],
  ["/sign-in", 200],
  ["/robots.txt", 200],
  ["/sitemap.xml", 200],
  ["/api/health", 200],
  ["/this-page-does-not-exist-rh-check", 404],
]) {
  try {
    const r = await fetch(origin + path, {
      signal: AbortSignal.timeout(20000),
      redirect: "follow",
    });
    const body = await r.text();
    const ok = r.status === expected && !body.includes('"digest"');
    console.log(ok ? "PASS" : "FAIL", path, "HTTP", r.status);
    if (!ok) failed++;
  } catch {
    console.log("FAIL", path, "connection or timeout");
    failed++;
  }
}
console.log(
  "Read-only checks complete. This does not verify login, payments, emails or backups.",
);
process.exitCode = failed ? 1 : 0;
