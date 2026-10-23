import { publicMetadata } from "@/lib/seo";
export function generateMetadata() {
  return publicMetadata(
    "Career resources",
    "Explore digital resources to help you prepare for your next opportunity.",
    "/shop",
  );
}
import { CartCount } from "@/components/cart";
import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import { Breadcrumbs, EmptyState } from "@/components/ui";
import { shopRecords } from "@/lib/queries";
import { ProductCard } from "@/components/product-card";
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { products, categories } = await shopRecords(),
    query = await searchParams;
  const search = (query.q || "").trim().slice(0, 150).toLowerCase();
  const filtered = products.filter(
    (p) =>
      (!query.category || p.category_id === query.category) &&
      (!search ||
        (p.name + " " + p.description).toLowerCase().includes(search)),
  );
  return (
    <main id="rh-main" className="rm-page rm-shell app-shop-page">
      <Breadcrumbs items={[{ label: "REMOTE HUSTLE shop" }]} />
      <h1 className="app-visually-hidden">REMOTE HUSTLE shop</h1>
      <div className="app-shop-toolbar">
        <form className="app-filter-bar">
          <label className="app-field">
            Search resources
            <input
              name="q"
              placeholder="Name or keyword"
              defaultValue={query.q || ""}
              maxLength={150}
            />
          </label>
          <label className="app-field">
            Category
            <Dropdown name="category" defaultValue={query.category || ""}>
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Dropdown>
          </label>
          <button className="rm-btn">Search</button>
          {(query.q || query.category) && (
            <Link href="/shop">Clear filters</Link>
          )}
        </form>
        <div className="app-shop-actions">
          <CartCount variant="button" />
          <Link className="rm-btn rm-btn-secondary" href="/workspace/orders">
            Your orders
          </Link>
        </div>
      </div>
      {filtered.length ? (
        <div
          className={
            "app-product-grid " +
            (filtered.length > 1
              ? "app-products-compact"
              : "app-products-single")
          }
        >
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            products.length
              ? "No resources match your search."
              : "Resources are being prepared."
          }
        >
          {products.length
            ? "Try a different search or category."
            : "Products will appear here when the team publishes them."}
        </EmptyState>
      )}
    </main>
  );
}
