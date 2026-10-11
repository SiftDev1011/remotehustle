import { notFound } from "next/navigation";
import { publicProduct } from "@/lib/seo";
import { Breadcrumbs, Badge } from "@/components/ui";
import { AddToCart } from "@/components/cart";
import { money } from "@/lib/management";
export const metadata = {
  title: "Purchase a resource",
  robots: { index: false, follow: false },
};
export default async function Buy({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const product = await publicProduct((await params).id);
  if (!product) notFound();
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <Breadcrumbs
        items={[{ label: "Shop", href: "/shop" }, { label: product.name }]}
      />
      <section className="app-card">
        <Badge>Digital download</Badge>
        <h1>{product.name}</h1>
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.name}
            width={600}
            height={400}
            style={{ width: "100%", height: "auto", borderRadius: 12 }}
          />
        )}
        <p className="rm-note app-preline">{product.description}</p>
        <p className="app-product-price">{money(product.price_minor)}</p>
        <AddToCart product={product} buyNow />
        <p className="rm-note">
          You’ll review your cart before payment. A verified, approved account
          and complete profile are required. Downloads become available after
          payment is confirmed.
        </p>
      </section>
    </main>
  );
}
