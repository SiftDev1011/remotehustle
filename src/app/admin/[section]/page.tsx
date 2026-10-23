import { PurchaseLink } from "@/components/purchase-link";
import { appUrl } from "@/lib/env";
import { Disclosure } from "@/components/disclosure";
import Link from "next/link";
import { notFound } from "next/navigation";
import { idSchema } from "@/lib/validation";
import { requireArea } from "@/lib/auth";
import { managedSection, management, money } from "@/lib/management";
import { saveManagedAction, deleteManagedAction } from "@/actions/management";
import { ActionForm } from "@/components/action-form";
import { AssetUpload } from "@/components/asset-upload";
import {
  Breadcrumbs,
  PageHeading,
  Input,
  Select,
  TextArea,
  EmptyState,
  Notice,
} from "@/components/ui";
export default async function ManagementPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{
    edit?: string;
    saved?: string;
    removed?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const { section } = await params;
  if (!managedSection(section)) notFound();
  const config = management[section],
    context = await requireArea(config.area),
    query = await searchParams;
  const page = Math.max(
    0,
    Math.min(10000, Math.floor(Number(query.page) || 0)),
  );
  let request = context.db
    .from(config.table)
    .select("*", { count: "exact" })
    .order(config.label)
    .range(page * 30, page * 30 + 29);
  if (query.q?.trim())
    request = request.ilike(
      config.label,
      "%" + query.q.trim().slice(0, 100) + "%",
    );
  const result = await request;
  if (result.error) throw new Error("Unable to load management records.");
  const records = result.data || [];
  let record: Record<string, any> | undefined;
  if (query.edit && query.edit !== "new") {
    if (!idSchema.safeParse(query.edit).success) notFound();
    const selected = await context.db
      .from(config.table)
      .select("*")
      .eq("id", query.edit)
      .maybeSingle();
    if (selected.error) throw new Error("Unable to load record.");
    if (!selected.data) notFound();
    record = selected.data;
  }
  const categories =
    section === "products"
      ? (
          await context.db
            .from("product_categories")
            .select("id,name,active")
            .order("name")
        ).data || []
      : [];
  const careerResult =
    section === "programs" || section === "products"
      ? await context.db
          .from("job_categories")
          .select("id,name,active")
          .order("name")
      : null;
  if (careerResult?.error) throw new Error("Unable to load career categories.");
  const careerCategories = careerResult?.data || [];
  const r = record || {};
  let assetId = "";
  if (section === "products" && record) {
    const file = await context.db
      .from("product_files")
      .select("asset_id")
      .eq("product_id", r.id)
      .maybeSingle();
    if (file.error) throw new Error("Unable to load product file.");
    assetId = file.data?.asset_id || "";
  }
  const input = (
    name: string,
    label: string,
    required = false,
    type = "text",
    value?: string | number,
  ) => (
    <Input
      key={name}
      name={name}
      label={label}
      required={required}
      type={type}
      defaultValue={value ?? r[name] ?? ""}
    />
  );
  const check = (name: string, label: string) => (
    <label className="app-check">
      <input type="checkbox" name={name} defaultChecked={Boolean(r[name])} />
      {label}
    </label>
  );
  return (
    <main id="rh-main" className="rm-page rm-shell app-workspace-main">
      <Breadcrumbs
        items={[
          { label: "Team workspace", href: "/admin" },
          { label: config.title },
        ]}
      />
      <PageHeading title={config.title} />
      {section === "products" && (
        <Link className="rm-text-link" href="/admin/product-categories">
          Manage product categories
        </Link>
      )}
      {query.saved && <Notice tone="success">Changes saved.</Notice>}
      {query.removed && <Notice tone="success">Record removed.</Notice>}
      {query.edit ? (
        <section className="app-card">
          <h2>
            {record ? "Edit" : "Add"}{" "}
            {section === "partners"
              ? "organisation"
              : section === "programs"
                ? "programme"
                : section === "products"
                  ? "product"
                  : "record"}
          </h2>
          {section === "products" && record?.active && (
            <PurchaseLink url={appUrl() + "/buy/" + record.id} />
          )}
          <ActionForm
            action={saveManagedAction}
            label="Save changes"
            key={query.edit}
          >
            <input type="hidden" name="section" value={section} />
            <input type="hidden" name="id" value={r.id || ""} />
            {section === "product-categories" && (
              <>
                {input("name", "Category name", true)}
                {check("active", "Active category")}
              </>
            )}
            {section === "partners" && (
              <>
                {input("name", "Organisation name", true)}
                <AssetUpload
                  area="partners"
                  name="logo_url"
                  initial={r.logo_url || ""}
                />
                {input("website_url", "Website link", false, "url")}
                {input(
                  "sort_order",
                  "Display order",
                  false,
                  "number",
                  r.sort_order ?? 0,
                )}
                {check("active", "Show in Partnering Organisations strip")}
              </>
            )}
            {(section === "programs" || section === "products") && (
              <div>
                <Select
                  name="career_category_id"
                  label="Related career category"
                  defaultValue={r.career_category_id || ""}
                >
                  <option value="">Not assigned</option>
                  {careerCategories
                    .filter((c) => c.active || c.id === r.career_category_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.active ? "" : " (inactive)"}
                      </option>
                    ))}
                </Select>
                <p className="rm-note">
                  Links this item to jobs, training and resources in the same
                  field. Choose a category so it appears in category searches.
                </p>
              </div>
            )}
            {section === "faqs" && (
              <>
                {input("question", "Question", true)}
                <TextArea
                  name="answer"
                  label="Answer"
                  required
                  minLength={10}
                  maxLength={3000}
                  defaultValue={r.answer || ""}
                />
                {input(
                  "sort_order",
                  "Display order",
                  false,
                  "number",
                  r.sort_order ?? 0,
                )}
                {check(
                  "published",
                  "Publish answer on the website and make it available to the helper",
                )}
                <p className="rm-note">
                  Use approved public information only. Do not include customer
                  details, passwords or private instructions.
                </p>
              </>
            )}
            {section === "programs" && (
              <>
                {input("title", "Programme title", true)}
                <Select
                  name="type"
                  label="Programme type"
                  defaultValue={r.type || "training"}
                >
                  <option value="training">Training</option>
                  <option value="internship">Internship</option>
                </Select>
                <TextArea
                  name="description"
                  label="Description"
                  required
                  minLength={10}
                  defaultValue={r.description || ""}
                />
                <AssetUpload
                  area="content"
                  name="image_url"
                  initial={r.image_url || ""}
                />
                {input("link", "Information / registration link", false, "url")}
                {input("starts_on", "Start date", false, "date")}
                {input("duration", "Duration")}
                {check("published", "Publish programme")}
              </>
            )}
            {section === "products" && (
              <>
                {input("name", "Product name", true)}
                <TextArea
                  name="description"
                  label="Description"
                  required
                  minLength={10}
                  defaultValue={r.description || ""}
                />
                <input type="hidden" name="type" value="digital" />
                <p className="rm-note">
                  All shop products are digital downloads. Upload a PDF or ZIP
                  before saving.
                </p>
                {r.type === "physical" && (
                  <Notice>
                    This older physical listing is hidden from the shop. Upload
                    its digital file to convert it into a digital product.
                  </Notice>
                )}
                <Select
                  name="category_id"
                  label="Product category"
                  defaultValue={r.category_id || ""}
                >
                  <option value="">Uncategorised</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </Select>
                {input(
                  "price",
                  "Price (₦)",
                  true,
                  "text",
                  r.price_minor == null ? "" : r.price_minor / 100,
                )}
                <AssetUpload
                  area="shop"
                  name="image_url"
                  initial={r.image_url || ""}
                />
                <AssetUpload
                  area="shop"
                  kind="digital"
                  name="asset_id"
                  initial={assetId}
                />
                <small>
                  Digital products require a file. Previous orders keep the file
                  purchased at checkout when you replace it.
                </small>
                {check("active", "Available in shop")}
              </>
            )}
            {section === "discounts" && (
              <>
                {input("code", "Code", true)}
                <Select
                  name="type"
                  label="Discount type"
                  defaultValue={r.type || "percent"}
                >
                  <option value="percent">Percentage</option>
                  <option value="fixed">Fixed amount (₦)</option>
                </Select>
                {input(
                  "value",
                  "Percentage or amount in naira",
                  true,
                  "text",
                  r.value == null
                    ? ""
                    : r.type === "fixed"
                      ? r.value / 100
                      : r.value,
                )}
                {input(
                  "minimum",
                  "Minimum product subtotal (₦)",
                  true,
                  "text",
                  (r.minimum_minor || 0) / 100,
                )}
                {input(
                  "starts_at",
                  "Starts at (UTC)",
                  false,
                  "datetime-local",
                  r.starts_at?.slice(0, 16) || "",
                )}
                {input(
                  "expires_at",
                  "Expires at (UTC)",
                  false,
                  "datetime-local",
                  r.expires_at?.slice(0, 16) || "",
                )}
                {check("active", "Enable code")}
              </>
            )}
            {section === "testimonials" && (
              <>
                <TextArea
                  name="quote"
                  label="Approved testimonial"
                  minLength={10}
                  maxLength={2000}
                  required
                  defaultValue={r.quote || ""}
                />
                {input("attribution", "Name / approved attribution", true)}
                {input("detail", "Role or context")}
                {check(
                  "consent_confirmed",
                  "We have permission to publish this quote and attribution",
                )}
                {check("published", "Publish testimonial")}
              </>
            )}
            {section === "impact" && (
              <>
                {input("label", "What the figure measures", true)}
                {input("value", "Display value", true)}
                <TextArea
                  name="evidence_note"
                  label="Source and verification date"
                  required
                  defaultValue={r.evidence_note || ""}
                />
                {check("published", "Publish verified figure")}
              </>
            )}
          </ActionForm>
          <Link className="rm-text-link" href={"/admin/" + section}>
            Back to list
          </Link>
          {record && section !== "products" && (
            <Disclosure className="app-section" label="Remove this record">
              <ActionForm
                action={deleteManagedAction}
                label="Remove record"
                danger
              >
                <input type="hidden" name="section" value={section} />
                <input type="hidden" name="id" value={r.id} />
                <label className="app-check">
                  <input type="checkbox" name="confirm" required />I confirm
                  this removal.
                </label>
              </ActionForm>
            </Disclosure>
          )}
        </section>
      ) : (
        <>
          <form className="app-filter-bar">
            <Input
              name="q"
              label="Search records"
              defaultValue={query.q || ""}
              maxLength={100}
            />
            <button className="rm-btn">Search</button>
          </form>
          <Link className="rm-btn" href={"/admin/" + section + "?edit=new"}>
            Add{" "}
            {section === "partners"
              ? "organisation"
              : section === "programs"
                ? "programme"
                : section === "products"
                  ? "product"
                  : "record"}{" "}
          </Link>
          {records.length ? (
            <div className="app-record-list app-section">
              {records.map((record) => (
                <Link
                  className="app-card app-record-row"
                  key={record.id}
                  href={"/admin/" + section + "?edit=" + record.id}
                >
                  <div>
                    <h3>{String(record[config.label])}</h3>
                    <p className="rm-note">
                      {record.type || record.state || record.detail || ""}
                      {record.price_minor != null
                        ? " · " + money(record.price_minor)
                        : ""}
                    </p>
                  </div>
                  <span>
                    {(record.active ?? record.published)
                      ? "Published / active"
                      : "Draft / inactive"}{" "}
                    · Edit
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No records yet.">
              Add approved content to make it available on the website.
            </EmptyState>
          )}
          <div className="app-inline-links">
            {page > 0 && (
              <Link
                href={
                  "?page=" +
                  (page - 1) +
                  "&q=" +
                  encodeURIComponent(query.q || "")
                }
              >
                Previous
              </Link>
            )}
            {(result.count || 0) > (page + 1) * 30 && (
              <Link
                href={
                  "?page=" +
                  (page + 1) +
                  "&q=" +
                  encodeURIComponent(query.q || "")
                }
              >
                Next
              </Link>
            )}
          </div>
        </>
      )}
    </main>
  );
}
