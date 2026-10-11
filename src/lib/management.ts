export type ManagedSection =
  | "partners"
  | "programs"
  | "products"
  | "discounts"
  | "testimonials"
  | "impact"
  | "product-categories";
export const management = {
  "product-categories": {
    title: "Product categories",
    area: "shop",
    table: "product_categories",
    label: "name",
  },
  partners: {
    title: "Partnering Organisations",
    area: "partners",
    table: "partners",
    label: "name",
  },
  programs: {
    title: "Training & internships",
    area: "content",
    table: "programs",
    label: "title",
  },
  products: {
    title: "Products",
    area: "shop",
    table: "products",
    label: "name",
  },
  discounts: {
    title: "Discount codes",
    area: "shop",
    table: "discounts",
    label: "code",
  },
  testimonials: {
    title: "Testimonials",
    area: "content",
    table: "testimonials",
    label: "attribution",
  },
  impact: {
    title: "Impact figures",
    area: "content",
    table: "impact_metrics",
    label: "label",
  },
} as const;
export function managedSection(value: string): value is ManagedSection {
  return Object.hasOwn(management, value);
}
export function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}
export function minorAmount(value: string) {
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(value))
    throw new Error("Enter a valid price with at most two decimal places.");
  const [whole, part = ""] = value.split(".");
  return Number(whole) * 100 + Number(part.padEnd(2, "0"));
}
