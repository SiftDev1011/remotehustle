import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { searchFilters, searchHref, SEARCH_KINDS } from "../src/lib/search";
const db = new PGlite();
const category = "10000000-0000-4000-8000-000000000001",
  other = "10000000-0000-4000-8000-000000000002",
  location = "10000000-0000-4000-8000-000000000003",
  owner = "00000000-0000-4000-8000-000000000001",
  asset = "10000000-0000-4000-8000-000000000004";
async function as<T = Record<string, unknown>>(
  sql: string,
  values: unknown[] = [],
  user: string | null = null,
  role = "anon",
) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      user || "",
    ]);
    await tx.exec("set local role " + role);
    return tx.query<T>(sql, values);
  });
}
async function search(
  kind: string,
  q = "",
  cat: string | null = null,
  loc: string | null = null,
  page = 0,
  admin = false,
) {
  const result = await as<{
    result: { total: number; items: Record<string, any>[] };
  }>(
    "select public.search_catalog($1,$2,$3,$4,$5) as result",
    [kind, q, cat, loc, page],
    admin ? owner : null,
    admin ? "authenticated" : "anon",
  );
  return result.rows[0].result;
}
before(async () => {
  await db.exec(
    `create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;create schema auth;create table auth.users(id uuid primary key,email text not null,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',invited_at timestamptz,created_at timestamptz not null default now());create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`,
  );
  for (const name of (await readdir("supabase/migrations"))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile("supabase/migrations/" + name, "utf8"));
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'owner@example.test',now(),$2)",
    [
      owner,
      JSON.stringify({
        full_name: "Test owner",
        phone: "+2348012345678",
        consent: true,
      }),
    ],
  );
  await as(
    "select public.bootstrap_workspace_owner('owner@example.test')",
    [],
    null,
    "service_role",
  );
  await db.query(
    "insert into public.job_categories(id,name) values($1,'Customer Support'),($2,'Design')",
    [category, other],
  );
  await db.query("insert into public.locations(id,name) values($1,'Lagos')", [
    location,
  ]);
  for (const status of ["published", "draft", "closed"]) {
    await db.query(
      "insert into public.jobs(title,company,description,requirements,category_id,location_id,employment_type,status) values($1,'Test Employer','Help customers use their account.','Good communication skills',$2,$3,'full-time',$4)",
      ["Account representative " + status, category, location, status],
    );
  }
  await db.query(
    "insert into public.jobs(title,company,description,requirements,category_id,employment_type,status,closes_at) values('Expired representative','Test Employer','Help customers use their account.','Good communication skills',$1,'full-time','published',now()-interval '1 day')",
    [category],
  );
  for (const type of ["training", "internship"])
    for (const published of [true, false])
      await db.query(
        "insert into public.programs(title,description,type,published,career_category_id) values('Communication essentials','Learn how to communicate with customers.',$1,$2,$3)",
        [type, published, category],
      );
  await db.query(
    "insert into public.programs(title,description,type,published,career_category_id) values('Visual workshop','Practice illustration.','training',true,$1)",
    [other],
  );
  for (const type of ["digital", "physical"])
    for (const active of [true, false])
      await db.query(
        "insert into public.products(name,description,type,active,career_category_id,price_minor) values('Communication workbook','Practice explaining solutions.',$1,$2,$3,10000)",
        [type, active, category],
      );
  await db.query(
    "insert into public.media_assets(id,area,kind,original_name,mime_type,size_bytes,staging_key,object_key,status) values($1,'shop','digital','workbook.pdf','application/pdf',100,'stage-test','private-test','ready')",
    [asset],
  );
});
after(() => db.close());
test("career category filters return related content of all four types", async () => {
  for (const kind of SEARCH_KINDS) {
    const result = await search(kind, "", category);
    assert.equal(result.total, 1, kind);
    assert.equal(result.items.length, 1);
  }
});
test("typing a category name finds tagged items even without the category words in their titles", async () => {
  for (const kind of SEARCH_KINDS)
    assert.equal((await search(kind, "customer support")).total, 1, kind);
  assert.equal((await search("training", "", other)).total, 1);
  assert.equal((await search("resources", "", other)).total, 0);
});
test("title, description, employer and requirement keywords are searchable", async () => {
  assert.equal((await search("jobs", "employer")).total, 1);
  assert.equal((await search("jobs", "communication")).total, 1);
  assert.equal((await search("training", "essentials")).total, 1);
  assert.equal((await search("resources", "explaining")).total, 1);
  assert.equal((await search("training", "unmatchedword")).total, 0);
});
test("publication filters remain enforced for privileged users and private fields are excluded", async () => {
  for (const kind of SEARCH_KINDS) {
    const result = await search(kind, "", category, null, 0, true);
    assert.equal(result.total, 1, kind);
    for (const record of result.items) {
      assert.equal(record.search_document, undefined);
      assert.equal(record.application_url, undefined);
      assert.equal(record.asset_id, undefined);
      assert.equal(record.object_key, undefined);
    }
  }
});
test("location narrows jobs without hiding learning or digital resources", async () => {
  assert.equal((await search("jobs", "", category, location)).total, 1);
  assert.equal((await search("jobs", "", category, other)).total, 0);
  for (const kind of ["training", "internship", "resources"])
    assert.equal((await search(kind, "", category, other)).total, 1);
});
test("pagination has stable non-overlapping pages and complete counts", async () => {
  await db.exec(
    "insert into public.programs(title,description,type,published,created_at) select 'Pagination course '||n,'Pagination examples','training',true,'2026-01-01'::timestamptz from generate_series(1,14)n",
  );
  const pages = await Promise.all(
    [0, 1, 2].map((p) => search("training", "pagination", null, null, p)),
  );
  assert.deepEqual(
    pages.map((p) => p.total),
    [14, 14, 14],
  );
  assert.deepEqual(
    pages.map((p) => p.items.length),
    [6, 6, 2],
  );
  assert.equal(
    new Set(pages.flatMap((p) => p.items.map((i) => i.id))).size,
    14,
  );
  assert.deepEqual(
    (await search("training", "pagination", null, null, 0)).items,
    pages[0].items,
  );
});
test("product save persists career category and still enforces file and admin permissions", async () => {
  const product = {
    name: "Tagged handbook",
    description: "An admin managed digital handbook.",
    type: "digital",
    price_minor: 10000,
    active: true,
    career_category_id: other,
  };
  const saved = await as<{ id: string }>(
    "select public.save_product(null,$1,$2) as id",
    [JSON.stringify(product), asset],
    owner,
    "authenticated",
  );
  assert.equal(
    (await search("resources", "", other)).items[0].id,
    saved.rows[0].id,
  );
  await assert.rejects(
    as(
      "select public.save_product(null,$1,$2)",
      [JSON.stringify(product), asset],
      null,
      "authenticated",
    ),
    /Access denied/,
  );
  await assert.rejects(
    as(
      "select public.save_product(null,$1,null)",
      [JSON.stringify(product)],
      owner,
      "authenticated",
    ),
    /Upload a digital file/,
  );
});
test("inactive categories cannot be newly assigned but existing records remain editable", async () => {
  await db.query("update public.job_categories set active=false where id=$1", [
    other,
  ]);
  await assert.rejects(
    as(
      "insert into public.programs(title,description,type,career_category_id) values('Invalid category','Test description','training',$1)",
      [other],
      owner,
      "authenticated",
    ),
    /Choose an active career/,
  );
  await as(
    "update public.programs set description='An updated description' where career_category_id=$1",
    [other],
    owner,
    "authenticated",
  );
});
test("query normalization and pagination links preserve independent filters safely", () => {
  const filters = searchFilters({
    q: "  customer support  ",
    category,
    location,
    jobsPage: "2",
    resourcesPage: "-3",
    trainingPage: "wat",
    internshipPage: "1e99",
  });
  assert.equal(filters.q, "customer support");
  assert.deepEqual(filters.pages, {
    jobs: 2,
    training: 0,
    internship: 10000,
    resources: 0,
  });
  const href = searchHref(filters, "resources", 1);
  const url = new URL(href, "https://example.test");
  assert.equal(url.searchParams.get("jobsPage"), "2");
  assert.equal(url.searchParams.get("resourcesPage"), "1");
  assert.equal(url.searchParams.get("category"), category);
  assert.equal(url.hash, "#resources");
  assert.equal(
    searchFilters({ q: ["bad", "duplicate"], category: "invalid" }).q,
    "",
  );
  assert.equal(searchFilters({ category: "invalid" }).category, "");
});
test("punctuation-only and SQL-like search text do not cause query errors", async () => {
  for (const q of ["'", "%", "---", "😀", "'; drop table public.jobs; --"]) {
    const result = await search("jobs", q);
    assert.equal(typeof result.total, "number");
  }
});

test("FAQs expose only published answers and only content admins can write", async () => {
  const original = await as<{ id: string }>("select id from public.faqs");
  assert.equal(original.rows.length, 6);
  const draft = await as<{ id: string }>(
    "insert into public.faqs(question,answer) values('A private draft question','Do not publish this draft answer.') returning id",
    [],
    owner,
    "authenticated",
  );
  assert.equal(
    (await as("select id from public.faqs where id=$1", [draft.rows[0].id]))
      .rows.length,
    0,
  );
  assert.equal(
    (
      await as(
        "select id from public.faqs where id=$1",
        [draft.rows[0].id],
        owner,
        "authenticated",
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    as(
      "insert into public.faqs(question,answer) values('Unauthorised question','This must not be saved.')",
      [],
      null,
      "authenticated",
    ),
    /row-level security/,
  );
  await as(
    "update public.faqs set published=true where id=$1",
    [draft.rows[0].id],
    owner,
    "authenticated",
  );
  assert.equal(
    (await as("select id from public.faqs where id=$1", [draft.rows[0].id]))
      .rows.length,
    1,
  );
});
test("helper counters enforce network and global caps without exposing them to visitors", async () => {
  const fingerprint = "a".repeat(64);
  await assert.rejects(
    as("select public.reserve_helper_request($1,100)", [fingerprint]),
    /permission denied/,
  );
  await assert.rejects(
    as("select * from private.helper_usage"),
    /permission denied/,
  );
  for (let i = 0; i < 20; i++)
    assert.equal(
      (
        await as<{ result: string }>(
          "select public.reserve_helper_request($1,100) as result",
          [fingerprint],
          null,
          "service_role",
        )
      ).rows[0].result,
      "allowed",
    );
  assert.equal(
    (
      await as<{ result: string }>(
        "select public.reserve_helper_request($1,100) as result",
        [fingerprint],
        null,
        "service_role",
      )
    ).rows[0].result,
    "rate",
  );
  assert.equal(
    (
      await as<{ result: string }>(
        "select public.reserve_helper_request($1,20) as result",
        ["b".repeat(64)],
        null,
        "service_role",
      )
    ).rows[0].result,
    "budget",
  );
  await db.exec(
    "update private.helper_usage set expires_at=now()-interval '1 minute'",
  );
  assert.equal(
    (
      await as<{ result: string }>(
        "select public.reserve_helper_request($1,100) as result",
        [fingerprint],
        null,
        "service_role",
      )
    ).rows[0].result,
    "allowed",
  );
  const counts = await db.query<{ attempts: number }>(
    "select attempts from private.helper_usage",
  );
  assert.deepEqual(
    counts.rows.map((r) => r.attempts),
    [1, 1],
  );
});
