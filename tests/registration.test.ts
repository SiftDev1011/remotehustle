import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { registrationSchema } from "../src/lib/registration";
import { socialUrl, brandLogoKey } from "../src/lib/brand-settings";
const db = new PGlite();
const owner = "00000000-0000-4000-8000-000000000001",
  alice = "00000000-0000-4000-8000-000000000002",
  bob = "00000000-0000-4000-8000-000000000003",
  jobs = "00000000-0000-4000-8000-000000000004",
  unverified = "00000000-0000-4000-8000-000000000005",
  inactive = "00000000-0000-4000-8000-000000000006",
  category = "10000000-0000-4000-8000-000000000001";
const hash = (v: string) => createHash("sha256").update(v).digest("hex");
const answers = {
  full_name: "O’Connor Àdá 😀",
  date_of_birth: "1998-08-15",
  phone: "+2348012345678",
  whatsapp_active: true,
  gender: "Prefer not to say",
  country: "NG",
  state: "Lagos",
  address: "15 Sample Road",
  primary_platform: "LinkedIn",
  social_handles: "@ada",
  skill_level: "Beginner",
  professional_platforms: "",
  performance_agreement: true,
  community_agreement: true,
  privacy_acknowledged: true,
  heard_from: "Friend or family",
};
async function as<T = Record<string, unknown>>(
  user: string | null,
  sql: string,
  values: unknown[] = [],
  role = "authenticated",
) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    await tx.exec("set local role " + role);
    return tx.query<T>(sql, values);
  });
}
const submit = (user: string, code: string, data = answers) =>
  as<{ result: { id?: string; error?: string } }>(
    user,
    "select public.submit_programme_registration($1,$2,$3) as result",
    [category, hash(code), JSON.stringify(data)],
  );
let codeId: string;
before(async () => {
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text not null,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',invited_at timestamptz,created_at timestamptz not null default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  for (const file of (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  let i = 0;
  for (const id of [owner, alice, bob, jobs, unverified, inactive]) {
    i++;
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)",
      [
        id,
        "user+" + i + "@example.test",
        id === unverified ? null : new Date().toISOString(),
        JSON.stringify({
          full_name: "Test user",
          phone: "+234801000000" + i,
          consent: true,
        }),
      ],
    );
  }
  await as(
    null,
    "select public.bootstrap_workspace_owner('user+1@example.test')",
    [],
    "service_role",
  );
  await db.query(
    "insert into public.admin_memberships(user_id,role,areas) values($1,'admin','{jobs}')",
    [jobs],
  );
  await db.query(
    "update public.worker_accounts set approval='inactive' where user_id=$1",
    [inactive],
  );
  await db.query("insert into public.job_categories(id,name) values($1,$2)", [
    category,
    "Writing",
  ]);
  codeId = (
    await as<{ id: string }>(
      owner,
      "select public.create_registration_code('First cohort',$1,1,null) as id",
      [hash("VALID-CODE")],
    )
  ).rows[0].id;
});
after(() => db.close());
test("registration validates dates, countries, agreements and Unicode names", () => {
  const valid = {
    ...answers,
    access_code: "RH1-123456789ABC",
    category_id: category,
  };
  assert.equal(registrationSchema.safeParse(valid).success, true);
  for (const patch of [
    { date_of_birth: "2099-01-01" },
    { date_of_birth: "1998-02-30" },
    { country: "ZZ" },
    { community_agreement: false },
    { privacy_acknowledged: false },
    { phone: "123" },
  ])
    assert.equal(
      registrationSchema.safeParse({ ...valid, ...patch }).success,
      false,
    );
});
test("brand URLs reject arbitrary hosts, credentials and traversal", () => {
  assert.equal(
    socialUrl("instagram", "https://www.instagram.com/remotehustle"),
    "https://www.instagram.com/remotehustle",
  );
  for (const u of [
    "javascript:alert(1)",
    "https://instagram.com.evil.test/",
    "https://name:pass@instagram.com/",
    "http://instagram.com/",
  ])
    assert.throws(() => socialUrl("instagram", u));
  const base = "https://assets.example.test/public",
    key = "images/10000000-0000-4000-8000-000000000001.webp";
  assert.equal(brandLogoKey(base + "/" + key, base), key);
  for (const u of [
    "https://evil.test/" + key,
    base + "/../" + key,
    base + "/" + key + "?secret=1",
    base + "/images/not-a-uuid.webp",
  ])
    assert.equal(brandLogoKey(u, base), null);
});
test("only users admins can create codes; browser cannot read hashes", async () => {
  await assert.rejects(
    as(jobs, "select public.create_registration_code('Nope',$1,null,null)", [
      hash("BAD"),
    ]),
    /Access denied/,
  );
  await assert.rejects(
    as(owner, "select code_hash from public.registration_codes"),
    /permission denied/,
  );
  assert.equal(
    (await as(alice, "select id,label from public.registration_codes")).rows
      .length,
    0,
  );
  await assert.rejects(
    as(null, "select id from public.registration_codes", [], "anon"),
    /permission denied/,
  );
});
test("submission is private, deduplicated and consumes one code use", async () => {
  const r = (
    await submit(alice, "VALID-CODE", {
      ...answers,
      email: "spoof@example.test",
      role: "super_admin",
    } as typeof answers)
  ).rows[0].result;
  assert.ok(r.id);
  const again = (await submit(alice, "WRONG-CODE")).rows[0].result;
  assert.equal(again.id, r.id);
  const own = (
    await as<{ email: string; data: Record<string, unknown> }>(
      alice,
      "select email,data from public.programme_registrations",
    )
  ).rows[0];
  assert.equal(own.email, "user+2@example.test");
  assert.equal(own.data.role, undefined);
  assert.equal(own.data.email, undefined);
  assert.equal(
    (await as(bob, "select id from public.programme_registrations")).rows
      .length,
    0,
  );
  assert.equal(
    (await as(jobs, "select id from public.programme_registrations")).rows
      .length,
    0,
  );
  assert.equal(
    (await as(owner, "select id from public.programme_registrations")).rows
      .length,
    1,
  );
  assert.match(
    (await submit(bob, "VALID-CODE")).rows[0].result.error!,
    /fully used/,
  );
  assert.equal(
    (
      await db.query<{ uses: number }>(
        "select uses from public.registration_codes where id=$1",
        [codeId],
      )
    ).rows[0].uses,
    1,
  );
  await assert.rejects(
    as(alice, "update public.programme_registrations set status='reviewed'"),
    /permission denied/,
  );
});
test("review and attention counts respect admin areas", async () => {
  const id = (
    await as<{ id: string }>(
      alice,
      "select id from public.programme_registrations",
    )
  ).rows[0].id;
  await assert.rejects(
    as(jobs, "select public.review_programme_registration($1,true)", [id]),
    /Access denied/,
  );
  assert.equal(
    (
      await as(
        owner,
        "select total from public.admin_attention() where key='programme_registrations'",
      )
    ).rows[0].total,
    1,
  );
  assert.equal(
    (
      await as(
        jobs,
        "select total from public.admin_attention() where key='programme_registrations'",
      )
    ).rows.length,
    0,
  );
  await as(owner, "select public.review_programme_registration($1,true)", [id]);
  assert.equal(
    (await as(alice, "select status from public.programme_registrations"))
      .rows[0].status,
    "reviewed",
  );
});
test("disabled, expired codes and inactive or unverified users are rejected", async () => {
  await as(
    owner,
    "select public.create_registration_code('More places',$1,null,null)",
    [hash("MORE-CODE")],
  );
  await assert.rejects(submit(unverified, "MORE-CODE"), /Verify your email/);
  await assert.rejects(submit(inactive, "MORE-CODE"), /Account unavailable/);
  await db.exec(
    "update public.registration_codes set active=false where label='More places'",
  );
  assert.ok((await submit(bob, "MORE-CODE")).rows[0].result.error);
  await db.exec(
    "update public.registration_codes set active=true,expires_at=now()-interval '1 day' where label='More places'",
  );
  assert.ok((await submit(bob, "MORE-CODE")).rows[0].result.error);
});
test("invalid code attempts persist and stop repeated guesses", async () => {
  await db.query("delete from private.registration_attempts where user_id=$1", [
    bob,
  ]);
  for (let i = 0; i < 10; i++)
    assert.match(
      (await submit(bob, "WRONG-CODE")).rows[0].result.error!,
      /access code/,
    );
  assert.match(
    (await submit(bob, "WRONG-CODE")).rows[0].result.error!,
    /Too many/,
  );
  await db.query(
    "update private.registration_attempts set window_start=now()-interval '2 hours' where user_id=$1",
    [bob],
  );
  assert.match(
    (await submit(bob, "WRONG-CODE")).rows[0].result.error!,
    /access code/,
  );
});
test("database enforces required agreements; account deletion cascades programme data", async () => {
  await as(
    owner,
    "select public.create_registration_code('Final places',$1,null,null)",
    [hash("FINAL-CODE")],
  );
  const r = await submit(bob, "FINAL-CODE", {
    ...answers,
    performance_agreement: false,
  });
  assert.match(r.rows[0].result.error!, /required details/);
  assert.ok((await submit(bob, "FINAL-CODE")).rows[0].result.id);
  await db.query("delete from auth.users where id=$1", [bob]);
  assert.equal(
    (
      await db.query(
        "select id from public.programme_registrations where user_id=$1",
        [bob],
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select user_id from private.registration_attempts where user_id=$1",
        [bob],
      )
    ).rows.length,
    0,
  );
});

test("database accepts shorter international numbers without changing existing Nigerian numbers", async () => {
  const result = await db.query<{ phone: string }>(
    "select private.canonical_phone('+6831234') as phone",
  );
  assert.equal(result.rows[0].phone, "+6831234");
  await db.query("update public.profiles set phone=$1 where user_id=$2", [
    "+6831234",
    alice,
  ]);
  assert.equal(
    (
      await db.query<{ phone: string }>(
        "select phone from public.profiles where user_id=$1",
        [alice],
      )
    ).rows[0].phone,
    "+6831234",
  );
  assert.equal(
    (
      await db.query<{ phone: string }>(
        "select private.canonical_phone('0801 234 5678') as phone",
      )
    ).rows[0].phone,
    "+2348012345678",
  );
});
