import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const db = new PGlite();
const ids = {
  owner: "00000000-0000-4000-8000-000000000001",
  alice: "00000000-0000-4000-8000-000000000002",
  bob: "00000000-0000-4000-8000-000000000003",
  jobs: "00000000-0000-4000-8000-000000000004",
  users: "00000000-0000-4000-8000-000000000005",
  orders: "00000000-0000-4000-8000-000000000006",
  unverified: "00000000-0000-4000-8000-000000000007",
  category: "10000000-0000-4000-8000-000000000001",
  skill: "10000000-0000-4000-8000-000000000002",
  location: "10000000-0000-4000-8000-000000000003",
  job: "20000000-0000-4000-8000-000000000001",
  external: "20000000-0000-4000-8000-000000000002",
};
async function as<T = Record<string, unknown>>(
  user: string | null,
  sql: string,
  values: unknown[] = [],
  role = "authenticated",
) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [
      user || "",
    ]);
    await tx.exec("set local role " + role);
    return tx.query<T>(sql, values);
  });
}
before(async () => {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key, email text not null, email_confirmed_at timestamptz, raw_user_meta_data jsonb default '{}', invited_at timestamptz, created_at timestamptz not null default now());
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const name of (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
  let i = 0;
  for (const name of [
    "owner",
    "alice",
    "bob",
    "jobs",
    "users",
    "orders",
    "unverified",
  ] as const) {
    i++;
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)",
      [
        ids[name],
        name + "@example.test",
        name === "unverified" ? null : new Date().toISOString(),
        JSON.stringify({
          full_name: name,
          phone: "+234801000000" + i,
          consent: true,
          role: "super_admin",
        }),
      ],
    );
  }
  await as(
    null,
    "select public.bootstrap_workspace_owner($1)",
    ["owner@example.test"],
    "service_role",
  );
  await db.query(
    "insert into public.admin_memberships(user_id,role,areas) values($1,'admin','{jobs}'),($2,'admin','{users}'),($3,'admin','{orders}')",
    [ids.jobs, ids.users, ids.orders],
  );
  await db.query("insert into public.job_categories(id,name) values($1,$2)", [
    ids.category,
    "Test category",
  ]);
  await db.query("insert into public.skills(id,name) values($1,$2)", [
    ids.skill,
    "Test skill",
  ]);
  await db.query("insert into public.locations(id,name) values($1,$2)", [
    ids.location,
    "Test location",
  ]);
  ids.job = (
    await as<{ id: string }>(
      ids.jobs,
      "select public.save_job(null,$1) as id",
      [
        JSON.stringify({
          title: "A real test role",
          company: "Test employer",
          description: "An opportunity description for the policy test.",
          requirements: "Relevant test skills.",
          category_id: ids.category,
          location_id: ids.location,
          employment_type: "full-time",
          application_type: "internal",
          currency: "NGN",
          salary_period: "month",
          status: "published",
        }),
      ],
    )
  ).rows[0].id;
  ids.external = (
    await as<{ id: string }>(
      ids.jobs,
      "select public.save_job(null,$1) as id",
      [
        JSON.stringify({
          title: "External test role",
          company: "Test employer",
          description: "An external opportunity for access rule tests.",
          requirements: "Relevant test skills.",
          employment_type: "contract",
          application_type: "external",
          application_url: "https://example.test/apply",
          currency: "NGN",
          salary_period: "month",
          status: "published",
        }),
      ],
    )
  ).rows[0].id;
});
after(async () => {
  await db.close();
});

test("anonymous visitors see published jobs but cannot read profiles or private CVs", async () => {
  assert.equal(
    (await as(null, "select id from public.jobs", [], "anon")).rows.length,
    2,
  );
  await assert.rejects(
    as(null, "select * from public.profiles", [], "anon"),
    /permission denied/,
  );
  await assert.rejects(
    as(null, "select * from public.cv_documents", [], "anon"),
    /permission denied/,
  );
});
test("profile isolation and metadata cannot grant admin privileges", async () => {
  const rows = (
    await as<{ user_id: string }>(
      ids.alice,
      "select user_id from public.profiles",
    )
  ).rows;
  assert.deepEqual(
    rows.map((x) => x.user_id),
    [ids.alice],
  );
  assert.equal(
    (await as(ids.alice, "select * from public.admin_memberships")).rows.length,
    0,
  );
  await assert.rejects(
    as(
      ids.alice,
      "insert into public.admin_memberships(user_id,role) values(auth.uid(),'super_admin')",
    ),
    /permission denied/,
  );
});
test("worker cannot approve own account or mutate approval through profile updates", async () => {
  await assert.rejects(
    as(
      ids.alice,
      "update public.worker_accounts set approval='approved' where user_id=auth.uid()",
    ),
    /permission denied/,
  );
  await assert.rejects(
    as(ids.alice, "select public.set_worker_approval(auth.uid(),'approved')"),
    /Access denied/,
  );
});
test("scoped administrators are denied other areas", async () => {
  await assert.rejects(
    as(ids.jobs, "select public.set_worker_approval($1,'approved')", [
      ids.alice,
    ]),
    /Access denied/,
  );
  await assert.rejects(
    as(ids.orders, "select public.save_job(null,$1)", [JSON.stringify({})]),
    /Access denied/,
  );
  await assert.rejects(
    as(ids.jobs, "select * from public.list_workers()"),
    /Access denied/,
  );
});
test("owner bootstrap is service-only and cannot create a second owner", async () => {
  await assert.rejects(
    as(ids.alice, "select public.bootstrap_workspace_owner($1)", [
      "alice@example.test",
    ]),
    /permission denied/,
  );
  await assert.rejects(
    as(
      null,
      "select public.bootstrap_workspace_owner($1)",
      ["alice@example.test"],
      "anon",
    ),
    /permission denied/,
  );
  await assert.rejects(
    as(
      null,
      "select public.bootstrap_workspace_owner($1)",
      ["alice@example.test"],
      "service_role",
    ),
    /owner already exists/,
  );
  assert.equal(
    (
      await db.query(
        "select user_id from public.admin_memberships where role='super_admin'",
      )
    ).rows.length,
    1,
  );
});
test("profile RPC ignores privileged fields and removes blank preferences", async () => {
  const data = {
    full_name: "Bob Worker",
    phone: "+2348010000003",
    location_id: ids.location,
    category_id: ids.category,
    experience: "Relevant work",
    education: "Education",
    linkedin_url: "https://example.test/bob",
    preferred_roles: ["  Support  ", "Support", " "],
    employment_preferences: ["full-time"],
    interests: [" ", ""],
    skill_ids: [ids.skill],
    email: "spoof@example.test",
    approval: "approved",
    role: "super_admin",
    cv_id: ids.job,
  };
  await as(ids.bob, "select public.save_profile($1,$2)", [
    ids.bob,
    JSON.stringify(data),
  ]);
  const record = (
    await as<{
      email: string;
      cv_id: string | null;
      preferred_roles: string[];
      interests: string[];
    }>(
      ids.bob,
      "select email,cv_id,preferred_roles,interests from public.profiles",
    )
  ).rows[0];
  assert.equal(record.email, "bob@example.test");
  assert.equal(record.cv_id, null);
  assert.deepEqual(record.preferred_roles, ["Support"]);
  assert.deepEqual(record.interests, []);
  assert.equal(
    (
      await as<{ approval: string }>(
        ids.bob,
        "select approval from public.worker_accounts",
      )
    ).rows[0].approval,
    "pending",
  );
  assert.equal(
    (await as(ids.bob, "select * from public.admin_memberships")).rows.length,
    0,
  );
});
test("unverified or deactivated administrators cannot use their assigned areas", async () => {
  await db.query(
    "insert into public.admin_memberships(user_id,role,areas) values($1,'admin','{jobs}')",
    [ids.unverified],
  );
  await assert.rejects(
    as(ids.unverified, "select public.save_job(null,$1)", [JSON.stringify({})]),
    /Access denied/,
  );
  await db.query(
    "update public.worker_accounts set approval='inactive' where user_id=$1",
    [ids.jobs],
  );
  await assert.rejects(
    as(ids.jobs, "select public.save_job(null,$1)", [JSON.stringify({})]),
    /Access denied/,
  );
  await db.query(
    "update public.worker_accounts set approval='approved' where user_id=$1",
    [ids.jobs],
  );
});
test("only the worker can change optional marketing consent", async () => {
  const record = (await as(ids.bob, "select * from public.profiles")).rows[0];
  const data = {
    ...record,
    employment_preferences: ["full-time"],
    skill_ids: [ids.skill],
    marketing_consent: true,
  };
  await as(ids.users, "select public.save_profile($1,$2)", [
    ids.bob,
    JSON.stringify(data),
  ]);
  assert.equal(
    (
      await as<{ marketing_consent: boolean }>(
        ids.bob,
        "select marketing_consent from public.profiles",
      )
    ).rows[0].marketing_consent,
    false,
  );
  await as(ids.bob, "select public.save_profile($1,$2)", [
    ids.bob,
    JSON.stringify(data),
  ]);
  assert.equal(
    (
      await as<{ marketing_consent: boolean }>(
        ids.bob,
        "select marketing_consent from public.profiles",
      )
    ).rows[0].marketing_consent,
    true,
  );
  await as(ids.users, "select public.save_profile($1,$2)", [
    ids.bob,
    JSON.stringify({ ...data, marketing_consent: false }),
  ]);
  assert.equal(
    (
      await as<{ marketing_consent: boolean }>(
        ids.bob,
        "select marketing_consent from public.profiles",
      )
    ).rows[0].marketing_consent,
    true,
  );
  await as(ids.bob, "select public.save_profile($1,$2)", [
    ids.bob,
    JSON.stringify({ ...data, marketing_consent: false }),
  ]);
});
test("duplicate Nigerian phone representations are rejected", async () => {
  await assert.rejects(
    db.query(
      "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values(gen_random_uuid(),$1,now(),$2)",
      [
        "duplicate@example.test",
        JSON.stringify({
          full_name: "Duplicate",
          phone: "08010000002",
          consent: true,
        }),
      ],
    ),
    /duplicate key/,
  );
});
test("terms acknowledgement is required on ordinary registration", async () => {
  await assert.rejects(
    db.query(
      "insert into auth.users(id,email,raw_user_meta_data) values(gen_random_uuid(),$1,$2)",
      [
        "noconsent@example.test",
        JSON.stringify({ full_name: "No consent", phone: "+2348011111111" }),
      ],
    ),
    /Terms consent is required/,
  );
});
test("pending and incomplete profiles cannot submit applications", async () => {
  await assert.rejects(
    as(ids.alice, "select public.submit_application($1,$2)", [ids.job, ""]),
    /Verify your email/,
  );
  await as(ids.users, "select public.set_worker_approval($1,'approved')", [
    ids.alice,
  ]);
  await assert.rejects(
    as(ids.alice, "select public.submit_application($1,$2)", [ids.job, ""]),
    /Verify your email/,
  );
});
test("private upload finalisation is denied to browser roles", async () => {
  await assert.rejects(
    as(ids.alice, "select public.finalize_cv_upload($1,$2)", [
      ids.job,
      ids.alice,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    as(ids.unverified, "select public.prepare_cv_upload($1,$2,$3)", [
      "cv.pdf",
      "application/pdf",
      100,
    ]),
    /Access denied/,
  );
});
let cvId = "",
  applicationId = "";
test("complete approved verified worker can apply; CV snapshot is attached", async () => {
  const profile = {
    full_name: "Alice Worker",
    phone: "+2348010000002",
    location_id: ids.location,
    category_id: ids.category,
    experience: "Relevant work",
    education: "Education",
    linkedin_url: "https://example.test/alice",
    preferred_roles: ["Support"],
    employment_preferences: ["full-time"],
    interests: ["Remote work"],
    skill_ids: [ids.skill],
  };
  await as(ids.alice, "select public.save_profile($1,$2)", [
    ids.alice,
    JSON.stringify(profile),
  ]);
  cvId = (
    await as<{ id: string }>(
      ids.alice,
      "select public.prepare_cv_upload($1,$2,$3) as id",
      ["cv.pdf", "application/pdf", 100],
    )
  ).rows[0].id;
  await as(
    null,
    "select public.finalize_cv_upload($1,$2)",
    [cvId, ids.alice],
    "service_role",
  );
  applicationId = (
    await as<{ id: string }>(
      ids.alice,
      "select public.submit_application($1,$2) as id",
      [ids.job, "My note"],
    )
  ).rows[0].id;
  const app = (
    await as<{ cv_id: string; status: string }>(
      ids.alice,
      "select cv_id,status from public.applications",
    )
  ).rows[0];
  assert.equal(app.cv_id, cvId);
  assert.equal(app.status, "submitted");
});
test("duplicate submissions and submission to external jobs are rejected", async () => {
  await assert.rejects(
    as(ids.alice, "select public.submit_application($1,$2)", [ids.job, ""]),
    /duplicate key/,
  );
  await assert.rejects(
    as(ids.alice, "select public.submit_application($1,$2)", [
      ids.external,
      "",
    ]),
    /Apply on the company website/,
  );
});
test("external company links are hidden until all eligibility gates pass", async () => {
  assert.equal(
    (await as(ids.bob, "select * from public.job_application_links")).rows
      .length,
    0,
  );
  assert.equal(
    (await as(ids.alice, "select * from public.job_application_links")).rows
      .length,
    1,
  );
});
test("CV access is allowed for applicant-review admins and denied to unrelated users/admins", async () => {
  assert.equal(
    (await as(ids.jobs, "select id from public.cv_documents")).rows.length,
    1,
  );
  assert.equal(
    (await as(ids.users, "select id from public.cv_documents")).rows.length,
    1,
  );
  assert.equal(
    (await as(ids.orders, "select id from public.cv_documents")).rows.length,
    0,
  );
  assert.equal(
    (await as(ids.bob, "select id from public.cv_documents")).rows.length,
    0,
  );
});
test("status updates atomically create events and a single queued notification", async () => {
  await as(ids.jobs, "select public.set_application_status($1,'shortlisted')", [
    applicationId,
  ]);
  await as(ids.jobs, "select public.set_application_status($1,'shortlisted')", [
    applicationId,
  ]);
  assert.equal(
    (
      await db.query(
        "select id from public.email_outbox where kind='application-status'",
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (await as(ids.alice, "select * from public.application_events")).rows
      .length,
    2,
  );
  await assert.rejects(
    as(ids.alice, "select public.set_application_status($1,'hired')", [
      applicationId,
    ]),
    /Access denied/,
  );
});
test("email queue claims have leases and cannot be called by users", async () => {
  await assert.rejects(
    as(ids.alice, "select * from public.claim_email_outbox()"),
    /permission denied/,
  );
  assert.equal(
    (
      await as(
        null,
        "select * from public.claim_email_outbox()",
        [],
        "service_role",
      )
    ).rows.length,
    2,
  );
  assert.equal(
    (
      await as(
        null,
        "select * from public.claim_email_outbox()",
        [],
        "service_role",
      )
    ).rows.length,
    0,
  );
});
test("closed jobs remain visible in own application history but disappear for visitors", async () => {
  await db.query("update public.jobs set status='closed' where id=$1", [
    ids.job,
  ]);
  assert.equal(
    (await as(ids.alice, "select id from public.jobs where id=$1", [ids.job]))
      .rows.length,
    1,
  );
  assert.equal(
    (
      await as(
        null,
        "select id from public.jobs where id=$1",
        [ids.job],
        "anon",
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    as(ids.jobs, "select public.delete_job($1)", [ids.job]),
    /has applicants/,
  );
});
test("deactivation blocks new applications and restores after reactivation", async () => {
  await as(ids.users, "select public.set_worker_approval($1,'inactive')", [
    ids.alice,
  ]);
  assert.equal(
    (await as(ids.alice, "select * from public.job_application_links")).rows
      .length,
    0,
  );
  await assert.rejects(
    as(ids.alice, "select public.prepare_cv_upload($1,$2,$3)", [
      "cv.pdf",
      "application/pdf",
      100,
    ]),
    /Access denied/,
  );
  await as(ids.users, "select public.set_worker_approval($1,'approved')", [
    ids.alice,
  ]);
  assert.equal(
    (await as(ids.alice, "select * from public.job_application_links")).rows
      .length,
    1,
  );
});
test("super admin assigns areas; jobs admin cannot change own access", async () => {
  await assert.rejects(
    as(
      ids.jobs,
      "select public.set_admin_access(auth.uid(),'{users,jobs}',true)",
    ),
    /Super admin/,
  );
  await as(ids.owner, "select public.set_admin_access($1,'{orders}',false)", [
    ids.orders,
  ]);
  await assert.rejects(
    as(ids.owner, "select public.set_admin_access(auth.uid(),'{users}',false)"),
    /Owner access/,
  );
});
test("admin accounts are protected from worker deletion controls", async () => {
  await assert.rejects(
    as(ids.users, "select public.assert_worker_deletion($1)", [ids.jobs]),
    /Manage administrator/,
  );
  await assert.rejects(
    as(ids.bob, "select public.assert_worker_deletion($1)", [ids.alice]),
    /Access denied/,
  );
});
test("account deletion cascades applications and queues private file cleanup", async () => {
  await assert.rejects(
    db.query("delete from public.cv_documents where id=$1", [cvId]),
    /foreign key constraint/,
  );
  await as(ids.users, "select public.assert_worker_deletion($1)", [ids.alice]);
  await db.query("delete from auth.users where id=$1", [ids.alice]);
  assert.equal(
    (
      await db.query("select * from public.profiles where user_id=$1", [
        ids.alice,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query("select * from public.applications where user_id=$1", [
        ids.alice,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query("select * from public.cv_documents where owner_id=$1", [
        ids.alice,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select * from public.storage_cleanup where object_key like $1",
        ["%" + cvId + "%"],
      )
    ).rows.length,
    2,
  );
});
test("all application tables have RLS enabled", async () => {
  const rows = (
    await db.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname,relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and relkind='r'",
    )
  ).rows;
  assert.equal(rows.length, 36);
  assert.ok(rows.every((r) => r.relrowsecurity));
});

test("contact submissions are service-only, limited, private and permission-scoped", async () => {
  const values = [
    "Example Visitor",
    "visitor@example.test",
    "An enquiry",
    "A message with enough information.",
    ["a".repeat(64), "b".repeat(64)],
  ];
  for (const [user, role] of [
    [null, "anon"],
    [ids.alice, "authenticated"],
    [ids.owner, "authenticated"],
  ] as const) {
    await assert.rejects(
      as(user, "select public.submit_contact($1,$2,$3,$4,$5)", values, role),
      /permission denied/,
    );
  }
  const result = await as<{ id: string }>(
    null,
    "select public.submit_contact($1,$2,$3,$4,$5) id",
    values,
    "service_role",
  );
  const id = result.rows[0].id;
  assert.equal(
    (
      await as(
        ids.alice,
        "select id from public.contact_messages where id=$1",
        [id],
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as(ids.jobs, "select id from public.contact_messages where id=$1", [
        id,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as(
        ids.owner,
        "select id from public.contact_messages where id=$1",
        [id],
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    as(ids.jobs, "select public.review_contact($1,'resolved','Done')", [id]),
    /Access denied/,
  );
  await as(
    ids.owner,
    "select public.review_contact($1,'resolved','Replied from the company mailbox')",
    [id],
  );
  await assert.rejects(
    as(
      ids.owner,
      "update public.contact_messages set status='new' where id=$1",
      [id],
    ),
    /permission denied/,
  );
  for (let i = 0; i < 4; i++)
    await as(
      null,
      "select public.submit_contact($1,$2,$3,$4,$5)",
      values,
      "service_role",
    );
  await assert.rejects(
    as(
      null,
      "select public.submit_contact($1,$2,$3,$4,$5)",
      values,
      "service_role",
    ),
    /CONTACT_RATE_LIMIT/,
  );
  assert.equal(
    (await db.query("select * from public.contact_messages")).rows.length,
    5,
  );
});
test("analytics uses role-scoped records, refuses public/inactive access and invalid periods", async () => {
  await assert.rejects(
    as(null, "select public.admin_analytics(30)", [], "anon"),
    /permission denied/,
  );
  await assert.rejects(
    as(ids.alice, "select public.admin_analytics(30)"),
    /Access denied/,
  );
  await assert.rejects(
    as(ids.owner, "select public.admin_analytics(999)"),
    /Invalid period/,
  );
  const jobs = (
    await as<{ data: Record<string, unknown> }>(
      ids.jobs,
      "select public.admin_analytics(30) data",
    )
  ).rows[0].data;
  assert.deepEqual(Object.keys(jobs), ["applications"]);
  const owner = (
    await as<{ data: Record<string, unknown> }>(
      ids.owner,
      "select public.admin_analytics(30) data",
    )
  ).rows[0].data;
  assert.equal(owner.contact_submissions, 5);
  assert.ok("orders_created" in owner);
  assert.ok("registrations" in owner);
});
test("operations and failed-email retries are super-admin only and cannot replay sent emails", async () => {
  await assert.rejects(
    as(ids.jobs, "select public.admin_operations()"),
    /Access denied/,
  );
  await assert.rejects(
    as(ids.users, "select public.admin_operations()"),
    /Access denied/,
  );
  await assert.rejects(
    as(null, "select public.admin_operations()", [], "anon"),
    /permission denied/,
  );
  const e = (
    await db.query<{ id: string }>(
      "insert into public.email_outbox(recipient_id,kind,dedupe_key,status,attempts) values($1,'welcome','operations-test','failed',8) returning id",
      [ids.owner],
    )
  ).rows[0].id;
  await assert.rejects(
    as(ids.users, "select public.retry_failed_email($1)", [e]),
    /Access denied/,
  );
  await as(ids.owner, "select public.retry_failed_email($1)", [e]);
  const row = (
    await db.query<{ status: string; attempts: number }>(
      "select status,attempts from public.email_outbox where id=$1",
      [e],
    )
  ).rows[0];
  assert.deepEqual(row, { status: "queued", attempts: 0 });
  await assert.rejects(
    as(ids.owner, "select public.retry_failed_email($1)", [e]),
    /Only failed/,
  );
  const data = (
    await as<{ data: { emails: unknown[] } }>(
      ids.owner,
      "select public.admin_operations() data",
    )
  ).rows[0].data;
  assert.ok(data.emails.length > 0);
});

test("used categories can be hidden without detaching records; only unused categories can be deleted", async () => {
  const category = "10000000-0000-4000-8000-000000000099";
  await as(
    ids.jobs,
    "insert into public.job_categories(id,name) values($1,'Retiring category')",
    [category],
  );
  // An existing worker profile must retain its assigned category.
  await db.query("update public.profiles set category_id=$1 where user_id=$2", [
    category,
    ids.bob,
  ]);
  await assert.rejects(
    as(ids.jobs, "delete from public.job_categories where id=$1", [category]),
    /foreign key constraint/,
  );
  const denied = await as(
    ids.orders,
    "update public.job_categories set active=false where id=$1 returning id",
    [category],
  );
  assert.equal(denied.rows.length, 0);
  await as(
    ids.jobs,
    "update public.job_categories set active=false where id=$1",
    [category],
  );
  assert.equal(
    (
      await as(
        null,
        "select id from public.job_categories where id=$1",
        [category],
        "anon",
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as(ids.jobs, "select id from public.job_categories where id=$1", [
        category,
      ])
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await db.query<{ category_id: string }>(
        "select category_id from public.profiles where user_id=$1",
        [ids.bob],
      )
    ).rows[0].category_id,
    category,
  );
  await as(
    ids.jobs,
    "update public.job_categories set active=true where id=$1",
    [category],
  );
  assert.equal(
    (
      await as(
        null,
        "select id from public.job_categories where id=$1",
        [category],
        "anon",
      )
    ).rows.length,
    1,
  );
  await db.query(
    "update public.profiles set category_id=null where user_id=$1",
    [ids.bob],
  );
  await as(ids.jobs, "delete from public.job_categories where id=$1", [
    category,
  ]);
  assert.equal(
    (
      await db.query("select id from public.job_categories where id=$1", [
        category,
      ])
    ).rows.length,
    0,
  );
});
