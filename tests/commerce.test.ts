import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const db = new PGlite();
const digitalMigration = "202610110010_digital_only_shop.sql";
const supportMigration = "202610110011_purchase_issues_attention.sql";
const policyMigration = "202610110012_policy_version.sql";
let legacyOrder: string;
const ids = Object.fromEntries(
  [
    "owner",
    "buyer",
    "stranger",
    "shop",
    "orders",
    "content",
    "partners",
    "pending",
    "unverified",
    "inactive",
    "category",
    "skill",
    "location",
    "asset",
    "asset2",
    "image",
    "physical",
    "digital",
    "rate",
    "otherRate",
  ].map((k) => [k, randomUUID()]),
);
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
async function scalar(
  user: string | null,
  sql: string,
  values: unknown[] = [],
  role = "authenticated",
) {
  return (await as<{ value: string }>(user, sql + " as value", values, role))
    .rows[0].value;
}
async function order(
  items: unknown,
  code = "",
  shipping: string | null = null,
  address: unknown = null,
  user = ids.buyer,
  key = randomUUID(),
) {
  return scalar(user, "select public.create_order($1,$2,$3,$4,$5)", [
    key,
    JSON.stringify(items),
    code,
    shipping,
    address == null ? null : JSON.stringify(address),
  ]);
}
async function attempt(orderId: string) {
  return scalar(ids.buyer, "select public.prepare_payment($1)", [orderId]);
}
async function pay(ref: string, amount = 250000, state = "success") {
  return scalar(
    null,
    "select public.record_payment($1,$2,$3,$4)",
    [ref, state, amount, "NGN"],
    "service_role",
  );
}
const digital = () => [{ id: ids.digital, quantity: 1 }];
const address = {
  name: "Test Buyer",
  phone: "+2348011111111",
  line1: "12 Test Street",
  city: "Ikeja",
  state: "Lagos",
  country: "NG",
};
before(async () => {
  await db.exec(`create role anon nologin;create role authenticated nologin;create role service_role nologin bypassrls;
 create schema auth;create table auth.users(id uuid primary key,email text not null,email_confirmed_at timestamptz,raw_user_meta_data jsonb default '{}',invited_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter(
      (x) =>
        x.endsWith(".sql") &&
        x < "202610110013" &&
        x !== digitalMigration &&
        x !== supportMigration &&
        x !== policyMigration,
    )
    .sort())
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
  let n = 0;
  for (const name of [
    "owner",
    "buyer",
    "stranger",
    "shop",
    "orders",
    "content",
    "partners",
    "pending",
    "unverified",
    "inactive",
  ])
    await db.query(
      "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,$2,$3,$4)",
      [
        ids[name],
        name + "@example.test",
        name === "unverified" ? null : new Date().toISOString(),
        JSON.stringify({
          full_name: name,
          phone: "+23480100000" + String(++n).padStart(2, "0"),
          consent: true,
        }),
      ],
    );
  await as(
    null,
    "select public.bootstrap_workspace_owner($1)",
    ["owner@example.test"],
    "service_role",
  );
  for (const name of ["shop", "orders", "content", "partners"])
    await db.query(
      "insert into public.admin_memberships(user_id,role,areas) values($1,'admin',$2)",
      [ids[name], "{" + name + "}"],
    );
  for (const [table, key] of [
    ["job_categories", "category"],
    ["skills", "skill"],
    ["locations", "location"],
  ])
    await db.query("insert into public." + table + "(id,name) values($1,$2)", [
      ids[key],
      "Test " + key,
    ]);
  for (const name of ["buyer", "stranger", "pending", "inactive"]) {
    await as(ids[name], "select public.save_profile($1,$2)", [
      ids[name],
      JSON.stringify({
        full_name: "Test " + name,
        phone:
          "+23480100000" +
          String(
            [
              "owner",
              "buyer",
              "stranger",
              "shop",
              "orders",
              "content",
              "partners",
              "pending",
              "unverified",
              "inactive",
            ].indexOf(name) + 1,
          ).padStart(2, "0"),
        location_id: ids.location,
        category_id: ids.category,
        experience: "Relevant experience",
        education: "Technical education",
        linkedin_url: "https://example.test/" + name,
        preferred_roles: ["Support"],
        employment_preferences: ["full-time"],
        interests: ["Learning"],
        skill_ids: [ids.skill],
      }),
    ]);
    const cv = await scalar(
      ids[name],
      "select public.prepare_cv_upload($1,$2,$3)",
      ["profile.pdf", "application/pdf", 100],
    );
    await as(
      null,
      "select public.finalize_cv_upload($1,$2)",
      [cv, ids[name]],
      "service_role",
    );
    if (name !== "pending")
      await as(ids.owner, "select public.set_worker_approval($1,'approved')", [
        ids[name],
      ]);
  }
  await as(ids.owner, "select public.set_worker_approval($1,'inactive')", [
    ids.inactive,
  ]);
  for (const [id, kind] of [
    [ids.asset, "digital"],
    [ids.asset2, "digital"],
    [ids.image, "image"],
  ])
    await as(
      null,
      "insert into public.media_assets(id,owner_id,area,kind,original_name,mime_type,size_bytes,staging_key,object_key,status,public_url) values($1,$2,'shop',$3,'test.pdf','application/pdf',100,$4,$5,'ready',$6)",
      [
        id,
        ids.shop,
        kind,
        "asset-staging/" + ids.shop + "/" + id + ".pdf",
        (kind === "digital" ? "digital/" : "images/") + id + ".pdf",
        kind === "image" ? "https://example.test/image.webp" : null,
      ],
      "service_role",
    );
  for (const [id, type, price] of [
    [ids.digital, "digital", 250000],
    [ids.physical, "physical", 100000],
  ])
    await as(ids.shop, "select public.save_product($1,$2,$3)", [
      id,
      JSON.stringify({
        name: "Test " + type,
        description: "Test product for actual database invariants.",
        type,
        price_minor: price,
        active: true,
      }),
      type === "digital" ? ids.asset : null,
    ]);
  await as(
    ids.orders,
    "insert into public.shipping_rates(id,name,state,fee_minor) values($1,'Lagos delivery','Lagos',50000),($2,'Abuja delivery','FCT',10000)",
    [ids.rate, ids.otherRate],
  );
  await as(
    ids.shop,
    "insert into public.discounts(code,type,value,minimum_minor) values('TEN','percent',10,10000),('FIXED','fixed',999999,0),('FREE','percent',100,0)",
  );
  await as(
    ids.content,
    "insert into public.site_content(key,value,published) values('commerce',$1,true)",
    [
      JSON.stringify({
        shipping_policy: "Test delivery policy approved for a database test.",
        refund_policy: "Test refund policy approved for a database test.",
      }),
    ],
  );
  // Build an actual pre-upgrade order, then verify the forward migration preserves it.
  legacyOrder = await order(
    [{ id: ids.physical, quantity: 1 }],
    "",
    ids.rate,
    address,
  );
  await db.exec(
    await readFile("supabase/migrations/" + digitalMigration, "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/" + supportMigration, "utf8"),
  );
  await db.exec(
    await readFile("supabase/migrations/" + policyMigration, "utf8"),
  );
});
after(async () => {
  await db.close();
});

test("policy update records the current version for new accounts and preserves previous consent", async () => {
  const existing = await db.query<{ terms_version: string }>(
    "select terms_version from public.profiles where user_id=$1",
    [ids.buyer],
  );
  assert.equal(existing.rows[0].terms_version, "2026-10-07");
  const freshId = randomUUID();
  await db.query(
    "insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values($1,'policy-version@example.test',now(),$2)",
    [freshId, JSON.stringify({ consent: true, full_name: "Policy test" })],
  );
  const fresh = await db.query<{ terms_version: string }>(
    "select terms_version from public.profiles where user_id=$1",
    [freshId],
  );
  assert.equal(fresh.rows[0].terms_version, "2026-10-11");
});

test("content, partners, shop and orders areas are isolated by RLS", async () => {
  await assert.rejects(
    as(ids.shop, "insert into public.partners(name) values('Not permitted')"),
    /row-level security/,
  );
  await assert.rejects(
    as(
      ids.partners,
      "insert into public.programs(title,type,description) values('Not permitted','training','Not permitted')",
    ),
    /row-level security/,
  );
  await assert.rejects(
    as(ids.orders, "select public.save_product(null,$1,null)", [
      JSON.stringify({}),
    ]),
    /Access denied/,
  );
  await assert.rejects(
    as(
      ids.content,
      "insert into public.shipping_rates(name,state,fee_minor) values('Wrong area','Lagos',100)",
    ),
    /row-level security/,
  );
  await assert.rejects(
    as(
      ids.buyer,
      "insert into public.discounts(code,type,value) values('FAKE','fixed',100)",
    ),
    /row-level security/,
  );
});
test("public content hides drafts and no public digital object key is readable", async () => {
  await as(
    ids.partners,
    "insert into public.partners(name,active) values('Approved organisation',true),('Draft organisation',false)",
  );
  await as(
    ids.content,
    "insert into public.programs(title,type,description,published) values('Approved programme','training','Approved description',true),('Draft programme','internship','Draft description',false)",
  );
  assert.equal(
    (await as(null, "select * from public.partners", [], "anon")).rows.length,
    1,
  );
  assert.equal(
    (await as(null, "select * from public.programs", [], "anon")).rows.length,
    1,
  );
  await assert.rejects(
    as(null, "select * from public.media_assets", [], "anon"),
    /permission denied/,
  );
  await assert.rejects(
    as(null, "select * from public.product_files", [], "anon"),
    /permission denied/,
  );
  assert.equal(
    (await as(ids.buyer, "select * from public.media_assets")).rows.length,
    0,
  );
  assert.equal(
    (await as(ids.orders, "select * from public.product_files")).rows.length,
    0,
  );
});
test("testimonial publication requires permission and digital products require a ready digital asset", async () => {
  await assert.rejects(
    as(
      ids.content,
      "insert into public.testimonials(quote,attribution,published) values('Test approved quotation','Test author',true)",
    ),
    /check constraint/,
  );
  await assert.rejects(
    as(ids.shop, "select public.save_product(null,$1,$2)", [
      JSON.stringify({
        name: "Test invalid",
        description: "This is a test product.",
        type: "digital",
        price_minor: 100,
        active: true,
      }),
      ids.image,
    ]),
    /Upload a digital file/,
  );
  await assert.rejects(
    as(ids.buyer, "update public.media_assets set status='ready'"),
    /permission denied/,
  );
});
test("product categories are shop-managed and inactive categories cannot be assigned", async () => {
  const id = randomUUID();
  await as(
    ids.shop,
    "insert into public.product_categories(id,name,active) values($1,'Test resources',true)",
    [id],
  );
  await assert.rejects(
    as(
      ids.content,
      "insert into public.product_categories(name) values('Not permitted')",
    ),
    /row-level security/,
  );
  await as(ids.shop, "select public.save_product($1,$2,$3)", [
    ids.digital,
    JSON.stringify({
      name: "Test digital",
      description: "Test product for database invariants.",
      type: "digital",
      price_minor: 250000,
      active: true,
      category_id: id,
    }),
    ids.asset,
  ]);
  assert.equal(
    (
      await as<{ category_id: string }>(
        null,
        "select category_id from public.products where id=$1",
        [ids.digital],
        "anon",
      )
    ).rows[0].category_id,
    id,
  );
  await as(
    ids.shop,
    "update public.product_categories set active=false where id=$1",
    [id],
  );
  assert.equal(
    (await as(null, "select * from public.product_categories", [], "anon")).rows
      .length,
    0,
  );
  await assert.rejects(
    as(ids.shop, "select public.save_product($1,$2,$3)", [
      ids.digital,
      JSON.stringify({
        name: "Test digital",
        description: "Test product for database invariants.",
        type: "digital",
        price_minor: 250000,
        active: true,
        category_id: id,
      }),
      ids.asset,
    ]),
    /active product category/,
  );
});
test("checkout requires verified, approved and complete accounts even when called directly", async () => {
  for (const user of [ids.pending, ids.unverified, ids.inactive, ids.shop])
    await assert.rejects(
      order(digital(), "", null, null, user),
      /Verify your email/,
    );
  await assert.rejects(
    as(
      null,
      "select public.create_order($1,$2)",
      [randomUUID(), JSON.stringify(digital())],
      "anon",
    ),
    /permission denied/,
  );
});
let normalOrder = "",
  normalReference = "";
test("checkout ignores client prices and snapshots authoritative prices and files", async () => {
  normalOrder = await order([
    { id: ids.digital, quantity: 1, price_minor: 1, total_minor: 0 },
  ]);
  const o = (
    await as<{ total_minor: number }>(
      ids.buyer,
      "select total_minor from public.orders where id=$1",
      [normalOrder],
    )
  ).rows[0];
  assert.equal(o.total_minor, 250000);
  const item = (
    await as<{ unit_minor: number; asset_id: string }>(
      ids.buyer,
      "select unit_minor,asset_id from public.order_items where order_id=$1",
      [normalOrder],
    )
  ).rows[0];
  assert.equal(item.unit_minor, 250000);
  assert.equal(item.asset_id, ids.asset);
  await assert.rejects(
    as(
      ids.buyer,
      "update public.orders set payment_status='paid' where id=$1",
      [normalOrder],
    ),
    /permission denied/,
  );
  await assert.rejects(
    as(
      ids.buyer,
      "insert into public.orders(user_id,request_key,receipt_email,subtotal_minor,total_minor,has_physical) values(auth.uid(),gen_random_uuid(),'fake',0,0,false)",
    ),
    /permission denied/,
  );
});
test("checkout retries with the same request key return one order", async () => {
  const key = randomUUID();
  const first = await order(digital(), "", null, null, ids.buyer, key);
  const second = await order(digital(), "", null, null, ids.buyer, key);
  assert.equal(first, second);
  assert.equal(
    (await db.query("select id from public.orders where request_key=$1", [key]))
      .rows.length,
    1,
  );
});
test("invalid quantities, duplicate products and inactive products are rejected", async () => {
  await assert.rejects(
    order([{ id: ids.digital, quantity: 2 }]),
    /valid quantity/,
  );
  await assert.rejects(
    order([{ id: ids.digital, quantity: 0 }]),
    /valid quantity/,
  );
  await assert.rejects(order([...digital(), ...digital()]), /Duplicate cart/);
  await db.query("update public.products set active=false where id=$1", [
    ids.digital,
  ]);
  await assert.rejects(order(digital()), /no longer available/);
  await db.query("update public.products set active=true where id=$1", [
    ids.digital,
  ]);
});
test("digital-only checkout rejects legacy physical products and never charges shipping", async () => {
  await assert.rejects(
    order([{ id: ids.physical, quantity: 1 }], "", ids.rate, address),
    /digital products only/,
  );
  await assert.rejects(
    order(
      [...digital(), { id: ids.physical, quantity: 1 }],
      "",
      ids.rate,
      address,
    ),
    /digital products only/,
  );
  const id = await order(digital(), "TEN", ids.rate, address);
  const result = (
    await db.query(
      "select subtotal_minor,discount_minor,shipping_minor,total_minor,has_physical,shipping_address from public.orders where id=$1",
      [id],
    )
  ).rows[0];
  assert.deepEqual(result, {
    subtotal_minor: 250000,
    discount_minor: 25000,
    shipping_minor: 0,
    total_minor: 225000,
    has_physical: false,
    shipping_address: null,
  });
});
test("product management rejects physical products even through a direct RPC", async () => {
  await assert.rejects(
    as(ids.shop, "select public.save_product($1,$2,$3)", [
      null,
      JSON.stringify({
        name: "Blocked physical product",
        description: "A direct RPC must enforce the digital-only shop.",
        type: "physical",
        price_minor: 100000,
        active: true,
      }),
      null,
    ]),
    /digital products only/,
  );
  assert.equal(
    (
      await db.query<{ type: string }>(
        "select type from public.products where id=$1",
        [ids.physical],
      )
    ).rows[0].type,
    "physical",
    "historical physical product is not silently converted",
  );
});
test("discounts clamp at subtotal, reject expired codes and free orders avoid the gateway", async () => {
  const id = await order(digital(), "FIXED");
  const o = (
    await db.query<{
      total_minor: number;
      payment_status: string;
      paid_reference: string;
    }>(
      "select total_minor,payment_status,paid_reference from public.orders where id=$1",
      [id],
    )
  ).rows[0];
  assert.equal(o.total_minor, 0);
  assert.equal(o.payment_status, "paid");
  assert.match(o.paid_reference, /^free-/);
  await assert.rejects(attempt(id), /already been paid/);
  await assert.rejects(
    as(ids.buyer, "select public.request_refund($1,$2)", [id, "Test refund"]),
    /permission denied/,
  );
  await as(
    ids.shop,
    "insert into public.discounts(code,type,value,starts_at,expires_at) values('OLD','percent',10,now()-interval '2 days',now()-interval '1 day')",
  );
  await assert.rejects(order(digital(), "OLD"), /invalid, expired/);
  assert.equal(
    await scalar(
      null,
      "select public.quote_discount($1,$2)",
      ["TEN", 250000],
      "anon",
    ),
    25000,
  );
});
test("checkout is closed until commercial policies have been published", async () => {
  await as(
    ids.content,
    "update public.site_content set published=false where key='commerce'",
  );
  await assert.rejects(
    order(digital()),
    /refund and download policy is published/,
  );
  await as(
    ids.content,
    "update public.site_content set published=true where key='commerce'",
  );
});
test("only a published, non-empty refund/download policy is required", async () => {
  const old = (
    await db.query<{ value: Record<string, string> }>(
      "select value from public.site_content where key='commerce'",
    )
  ).rows[0].value;
  try {
    await db.query(
      "update public.site_content set value=$1 where key='commerce'",
      [
        JSON.stringify({
          refund_policy:
            "Digital resource refund and download policy for local tests.",
        }),
      ],
    );
    assert.ok(await order(digital()));
    for (const value of [
      {
        shipping_policy: "A shipping policy cannot replace a download policy.",
      },
      { refund_policy: " ".repeat(30) },
      { refund_policy: "Too short" },
    ]) {
      await db.query(
        "update public.site_content set value=$1 where key='commerce'",
        [JSON.stringify(value)],
      );
      await assert.rejects(
        order(digital()),
        /refund and download policy is published/,
      );
    }
  } finally {
    await db.query(
      "update public.site_content set value=$1 where key='commerce'",
      [JSON.stringify(old)],
    );
  }
});
test("orders and payment attempts are private to the buyer and orders administrators", async () => {
  assert.equal(
    (await as(ids.stranger, "select * from public.orders")).rows.length,
    0,
  );
  assert.equal(
    (await as(ids.shop, "select * from public.orders")).rows.length,
    0,
  );
  assert.equal(
    (await as(ids.partners, "select * from public.order_items")).rows.length,
    0,
  );
  assert.ok(
    (await as(ids.orders, "select * from public.orders")).rows.length > 0,
  );
  await assert.rejects(
    scalar(ids.stranger, "select public.prepare_payment($1)", [normalOrder]),
    /Order not found/,
  );
});
test("payment retries reuse a pending reference and initialization has a single lease", async () => {
  normalReference = await attempt(normalOrder);
  assert.equal(await attempt(normalOrder), normalReference);
  assert.equal(
    await scalar(
      null,
      "select public.claim_payment_initialization($1)",
      [normalReference],
      "service_role",
    ),
    true,
  );
  assert.equal(
    await scalar(
      null,
      "select public.claim_payment_initialization($1)",
      [normalReference],
      "service_role",
    ),
    false,
  );
  await assert.rejects(
    as(ids.buyer, "select public.claim_payment_initialization($1)", [
      normalReference,
    ]),
    /permission denied/,
  );
});
test("payment verification rejects amount/currency mismatch and browser fulfilment", async () => {
  await assert.rejects(pay(normalReference, 1), /amount or currency/);
  await assert.rejects(
    as(
      null,
      "select public.record_payment($1,'success',250000,'USD')",
      [normalReference],
      "service_role",
    ),
    /amount or currency/,
  );
  await assert.rejects(
    as(ids.buyer, "select public.record_payment($1,'success',250000,'NGN')", [
      normalReference,
    ]),
    /permission denied/,
  );
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from public.orders where id=$1",
        [normalOrder],
      )
    ).rows[0].payment_status,
    "pending",
  );
});
test("replayed payment notifications fulfil once and enqueue exactly one message of each kind", async () => {
  await pay(normalReference);
  await pay(normalReference);
  await pay(normalReference, 250000, "failed");
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from public.orders where id=$1",
        [normalOrder],
      )
    ).rows[0].payment_status,
    "paid",
  );
  const rows = (
    await db.query<{ kind: string }>(
      "select kind from public.email_outbox where payload->>'order_id'=$1",
      [normalOrder],
    )
  ).rows;
  assert.deepEqual(rows.map((r) => r.kind).sort(), [
    "download-link",
    "order-confirmation",
  ]);
});
let duplicateOrder = "",
  duplicateReference = "",
  duplicateRefund = "";
test("a late second success creates a duplicate refund without fulfilling twice", async () => {
  duplicateOrder = await order(digital());
  const ref1 = await attempt(duplicateOrder);
  await pay(ref1, 250000, "failed");
  const ref2 = await attempt(duplicateOrder);
  assert.notEqual(ref1, ref2);
  await pay(ref2);
  await pay(ref1);
  duplicateReference = ref1;
  const o = (
    await db.query<{ paid_reference: string }>(
      "select paid_reference from public.orders where id=$1",
      [duplicateOrder],
    )
  ).rows[0];
  assert.equal(o.paid_reference, ref2);
  const refunds = (
    await db.query<{ id: string; kind: string }>(
      "select id,kind from public.refund_requests where order_id=$1",
      [duplicateOrder],
    )
  ).rows;
  assert.equal(refunds.length, 1);
  assert.equal(refunds[0].kind, "duplicate");
  duplicateRefund = refunds[0].id;
  assert.equal(
    (
      await db.query(
        "select id from public.email_outbox where payload->>'order_id'=$1",
        [duplicateOrder],
      )
    ).rows.length,
    2,
  );
});
let customerRefund = "";
test("customer refund endpoint is closed while historical financial corrections remain reviewable", async () => {
  for (const user of [ids.buyer, ids.stranger]) {
    await assert.rejects(
      as(user, "select public.request_refund($1,$2)", [
        normalOrder,
        "Test refund reason",
      ]),
      /permission denied/,
    );
  }
  // Fixture models a customer refund created before migration 011; no current customer endpoint creates it.
  customerRefund = (
    await db.query<{ id: string }>(
      "insert into public.refund_requests(order_id,payment_reference,kind,reason,amount_minor) select id,paid_reference,'customer','Historical request',total_minor from public.orders where id=$1 returning id",
      [normalOrder],
    )
  ).rows[0].id;
  await assert.rejects(
    as(ids.shop, "select public.review_refund($1,'approved','Valid note')", [
      customerRefund,
    ]),
    /Access denied/,
  );
  await as(
    ids.orders,
    "select public.review_refund($1,'approved','Approved test refund')",
    [customerRefund],
  );
  await assert.rejects(
    as(
      ids.orders,
      "select public.review_refund($1,'rejected','Change decision')",
      [customerRefund],
    ),
    /already been reviewed/,
  );
});
test("refund submission is claimed once; approved is not the same as refunded", async () => {
  assert.equal(
    await scalar(
      null,
      "select public.claim_refund($1)",
      [customerRefund],
      "service_role",
    ),
    true,
  );
  assert.equal(
    await scalar(
      null,
      "select public.claim_refund($1)",
      [customerRefund],
      "service_role",
    ),
    false,
  );
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from public.orders where id=$1",
        [normalOrder],
      )
    ).rows[0].payment_status,
    "paid",
  );
  await assert.rejects(
    as(ids.orders, "select public.claim_refund($1)", [customerRefund]),
    /permission denied/,
  );
  await assert.rejects(
    as(
      null,
      "select public.record_refund($1,'101',$2,1,'NGN','processed')",
      [customerRefund, normalReference],
      "service_role",
    ),
    /verification did not match/,
  );
});
test("confirmed refunds revoke paid state and cannot be reversed by replayed payment callbacks", async () => {
  await as(
    null,
    "select public.record_refund($1,'101',$2,250000,'NGN','processed')",
    [customerRefund, normalReference],
    "service_role",
  );
  await pay(normalReference);
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from public.orders where id=$1",
        [normalOrder],
      )
    ).rows[0].payment_status,
    "refunded",
  );
});
test("refunding an extra payment preserves the original paid order", async () => {
  await as(
    ids.orders,
    "select public.review_refund($1,'approved','Return the extra payment')",
    [duplicateRefund],
  );
  await as(
    null,
    "select public.claim_refund($1)",
    [duplicateRefund],
    "service_role",
  );
  await as(
    null,
    "select public.record_refund($1,'102',$2,250000,'NGN','processed')",
    [duplicateRefund, duplicateReference],
    "service_role",
  );
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from public.orders where id=$1",
        [duplicateOrder],
      )
    ).rows[0].payment_status,
    "paid",
  );
});
test("historical delivery records survive the upgrade with their permissions intact", async () => {
  const id = legacyOrder;
  await assert.rejects(
    as(
      ids.orders,
      "select public.set_fulfillment($1,'shipped','Tracking test')",
      [id],
    ),
    /paid physical order/,
  );
  const ref = await attempt(id);
  await pay(ref, 150000);
  await assert.rejects(
    as(
      ids.shop,
      "select public.set_fulfillment($1,'shipped','Tracking test')",
      [id],
    ),
    /Access denied/,
  );
  await as(
    ids.orders,
    "select public.set_fulfillment($1,'shipped','Tracking test')",
    [id],
  );
  await as(
    ids.orders,
    "select public.set_fulfillment($1,'delivered','Delivered test')",
    [id],
  );
  assert.equal(
    (
      await db.query<{ fulfillment_status: string }>(
        "select fulfillment_status from public.orders where id=$1",
        [id],
      )
    ).rows[0].fulfillment_status,
    "delivered",
  );
});
test("replacing a product file preserves the asset captured on earlier orders", async () => {
  await as(ids.shop, "select public.save_product($1,$2,$3)", [
    ids.digital,
    JSON.stringify({
      name: "Updated product",
      description: "Updated description for the test.",
      type: "digital",
      price_minor: 300000,
      active: true,
    }),
    ids.asset2,
  ]);
  const item = (
    await db.query<{ asset_id: string; unit_minor: number }>(
      "select asset_id,unit_minor from public.order_items where order_id=$1",
      [normalOrder],
    )
  ).rows[0];
  assert.equal(item.asset_id, ids.asset);
  assert.equal(item.unit_minor, 250000);
  const next = await order(digital());
  const fresh = (
    await db.query<{ asset_id: string; unit_minor: number }>(
      "select asset_id,unit_minor from public.order_items where order_id=$1",
      [next],
    )
  ).rows[0];
  assert.equal(fresh.asset_id, ids.asset2);
  assert.equal(fresh.unit_minor, 300000);
});
test("purchase issues require ownership, verified active access and valid input", async () => {
  const id = await order(digital());
  for (const user of [ids.stranger, ids.shop, ids.orders]) {
    await assert.rejects(
      as(
        user,
        "select public.report_purchase_issue($1,'payment','Payment did not confirm')",
        [id],
      ),
      /Order not found/,
    );
  }
  for (const user of [ids.unverified, ids.inactive]) {
    await assert.rejects(
      as(
        user,
        "select public.report_purchase_issue($1,'payment','Payment did not confirm')",
        [id],
      ),
      /Verify your email/,
    );
  }
  await assert.rejects(
    as(
      ids.buyer,
      "select public.report_purchase_issue($1,'refund','Wrong category')",
      [id],
    ),
    /Choose an issue/,
  );
  await assert.rejects(
    as(ids.buyer, "select public.report_purchase_issue($1,'file','x')", [id]),
    /Choose an issue/,
  );
  await assert.rejects(
    as(
      ids.buyer,
      "insert into public.purchase_issues(order_id,category,message) values($1,'file','Bypass endpoint')",
      [id],
    ),
    /permission denied/,
  );
});

test("purchase issues support pending orders, hide other customers and keep payment unchanged", async () => {
  const id = await order(digital());
  const issue = await scalar(
    ids.buyer,
    "select public.report_purchase_issue($1,'payment','Payment is still pending')",
    [id],
  );
  assert.equal(
    (
      await as(
        ids.stranger,
        "select id from public.purchase_issues where id=$1",
        [issue],
      )
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as(ids.shop, "select id from public.purchase_issues where id=$1", [
        issue,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await as(
        ids.orders,
        "select id from public.purchase_issues where id=$1",
        [issue],
      )
    ).rows.length,
    1,
  );
  assert.equal(
    (
      await as(ids.buyer, "select id from public.purchase_issues where id=$1", [
        issue,
      ])
    ).rows.length,
    1,
  );
  await assert.rejects(
    as(
      ids.buyer,
      "select public.report_purchase_issue($1,'file','A second active issue')",
      [id],
    ),
    /already open/,
  );
  await assert.rejects(
    as(
      ids.shop,
      "select public.review_purchase_issue($1,'resolved','This is fixed')",
      [issue],
    ),
    /Access denied/,
  );
  await assert.rejects(
    as(
      ids.buyer,
      "select public.review_purchase_issue($1,'resolved','This is fixed')",
      [issue],
    ),
    /Access denied/,
  );
  await assert.rejects(
    as(ids.orders, "select public.review_purchase_issue($1,'resolved','')", [
      issue,
    ]),
    /include a reply/,
  );
  await as(
    ids.orders,
    "select public.review_purchase_issue($1,'in_review','We are checking with the provider')",
    [issue],
  );
  assert.equal(
    (
      await as<{ admin_reply: string }>(
        ids.buyer,
        "select admin_reply from public.purchase_issues where id=$1",
        [issue],
      )
    ).rows[0].admin_reply,
    "We are checking with the provider",
  );
  const count = async () =>
    Number(
      (
        await as<{ total: number }>(
          ids.orders,
          "select total from public.admin_attention() where key='purchase_issues'",
        )
      ).rows[0].total,
    );
  const beforeCount = await count();
  await as(
    ids.orders,
    "select public.review_purchase_issue($1,'resolved','We checked this payment with the provider')",
    [issue],
  );
  assert.equal(await count(), beforeCount - 1);
  assert.equal(
    (
      await db.query<{ payment_status: string }>(
        "select payment_status from public.orders where id=$1",
        [id],
      )
    ).rows[0].payment_status,
    "pending",
  );
  assert.equal(
    (
      await db.query(
        "select id from public.refund_requests where order_id=$1",
        [id],
      )
    ).rows.length,
    0,
  );
  const followup = await scalar(
    ids.buyer,
    "select public.report_purchase_issue($1,'other','I still need some help')",
    [id],
  );
  assert.notEqual(followup, issue);
  await assert.rejects(
    as(
      ids.orders,
      "select public.review_purchase_issue($1,'open','Reopening')",
      [issue],
    ),
    /duplicate key/,
  );
});

test("admin attention is permission scoped and cannot be read by customers or inactive admins", async () => {
  for (const user of [ids.buyer, ids.unverified, ids.inactive]) {
    await assert.rejects(
      as(user, "select * from public.admin_attention()"),
      /Access denied/,
    );
  }
  await assert.rejects(
    as(null, "select * from public.admin_attention()", [], "anon"),
    /permission denied/,
  );
  const keys = async (user: string) =>
    (
      await as<{ key: string }>(
        user,
        "select key from public.admin_attention()",
      )
    ).rows
      .map((row) => row.key)
      .sort();
  assert.deepEqual(await keys(ids.orders), [
    "corrections",
    "payments",
    "purchase_issues",
  ]);
  assert.deepEqual(await keys(ids.shop), ["product_files"]);
  assert.deepEqual(await keys(ids.partners), ["partner_logos"]);
  assert.deepEqual(await keys(ids.content), ["policies"]);
  assert.ok((await keys(ids.owner)).includes("users"));
  assert.ok((await keys(ids.owner)).includes("applications"));
  await db.query(
    "update public.admin_memberships set active=false where user_id=$1",
    [ids.orders],
  );
  await assert.rejects(
    as(ids.orders, "select * from public.admin_attention()"),
    /Access denied/,
  );
  await db.query(
    "update public.admin_memberships set active=true where user_id=$1",
    [ids.orders],
  );
});

test("attention counts only old unresolved payment attempts and follows resolution", async () => {
  const id = await order(digital());
  const ref = await attempt(id);
  const count = async () =>
    Number(
      (
        await as<{ total: number }>(
          ids.orders,
          "select total from public.admin_attention() where key='payments'",
        )
      ).rows[0].total,
    );
  const initial = await count();
  await db.query(
    "update public.payment_attempts set created_at=now()-interval '20 minutes' where reference=$1",
    [ref],
  );
  assert.equal(await count(), initial + 1);
  await pay(ref, 300000, "failed");
  assert.equal(await count(), initial);
});

test("purchase support remains available after profile becomes incomplete and limits repeated reports", async () => {
  const id = await order(digital());
  await db.query("update public.profiles set education='' where user_id=$1", [
    ids.buyer,
  ]);
  const issue = await scalar(
    ids.buyer,
    "select public.report_purchase_issue($1,'file','The file will not open')",
    [id],
  );
  await as(
    ids.orders,
    "select public.review_purchase_issue($1,'resolved','Please use a PDF reader')",
    [issue],
  );
  // Existing reports count towards a rolling 24-hour per-user limit.
  const made = Number(
    (
      await db.query<{ n: number }>(
        "select count(*) n from public.purchase_issues i join public.orders o on o.id=i.order_id where o.user_id=$1",
        [ids.buyer],
      )
    ).rows[0].n,
  );
  for (let n = made; n < 5; n++) {
    const next = await scalar(
      ids.buyer,
      "select public.report_purchase_issue($1,'file','Another file access problem')",
      [id],
    );
    await as(
      ids.orders,
      "select public.review_purchase_issue($1,'resolved','Helped with the file')",
      [next],
    );
  }
  await assert.rejects(
    as(
      ids.buyer,
      "select public.report_purchase_issue($1,'file','Another file access problem')",
      [id],
    ),
    /daily support request limit/,
  );
});

test("deactivation hides private orders; account deletion preserves accounting records without a user link", async () => {
  await as(ids.owner, "select public.set_worker_approval($1,'inactive')", [
    ids.buyer,
  ]);
  assert.equal(
    (await as(ids.buyer, "select * from public.orders")).rows.length,
    0,
  );
  await as(ids.owner, "select public.set_worker_approval($1,'approved')", [
    ids.buyer,
  ]);
  await db.query("delete from auth.users where id=$1", [ids.buyer]);
  const row = (
    await db.query<{ user_id: string | null; receipt_email: string }>(
      "select user_id,receipt_email from public.orders where id=$1",
      [normalOrder],
    )
  ).rows[0];
  assert.equal(row.user_id, null);
  assert.equal(row.receipt_email, "buyer@example.test");
});
