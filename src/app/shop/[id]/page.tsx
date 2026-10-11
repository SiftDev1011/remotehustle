export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const product = await publicProduct((await params).id);
  return product
    ? publicMetadata(
        product.name,
        product.description.replace(/\s+/g, " ").slice(0, 160),
        "/shop/" + product.id,
      )
    : {
        title: "Resource unavailable",
        robots: { index: false, follow: false },
      };
}
import { notFound } from "next/navigation";
import { publicProduct, publicMetadata } from "@/lib/seo";
import { AddToCart } from "@/components/cart";
import { Breadcrumbs, Badge } from "@/components/ui";
import { money } from "@/lib/management";
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await publicProduct(id);
  if (!product) notFound();
  return (
    <main id="rh-main" className="rm-page rm-shell">
      <Breadcrumbs
        items={[{ label: "Shop", href: "/shop" }, { label: product.name }]}
      />
      <div className="app-product-detail">
        <div className="app-product-image">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              width={900}
              height={800}
            />
          ) : (
            <span>rh.</span>
          )}
        </div>
        <div>
          <Badge>Digital download</Badge>
          <h1>{product.name}</h1>
          <p className="app-preline rm-note">{product.description}</p>
          <p className="app-product-price">{money(product.price_minor)}</p>
          <AddToCart product={product} />
          <p className="rm-note">
            Download from your order page after payment is confirmed. No
            shipping fees.
          </p>
        </div>
      </div>
    </main>
  );
}
