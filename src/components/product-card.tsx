import Link from "next/link";
import type { Product } from "@/lib/commerce";
import { money } from "@/lib/management";
export function ProductCard({ product }: { product: Product }) {
  return (
    <Link href={"/shop/" + product.id} className="app-product-card">
      <div className="app-product-image">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            width={600}
            height={480}
            loading="lazy"
          />
        ) : (
          <span aria-hidden="true">RH.</span>
        )}
      </div>
      <div className="app-product-copy">
        <span className="rm-eyebrow">Digital resource</span>
        <h3>{product.name}</h3>
        <p>
          {product.description.slice(0, 130)}
          {product.description.length > 130 ? "…" : ""}
        </p>
        <strong>{money(product.price_minor)}</strong>
      </div>
    </Link>
  );
}
