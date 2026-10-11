export const metadata = { robots: { index: false, follow: false } };
import { shopRecords, websiteContent } from "@/lib/queries";
import { getContext } from "@/lib/auth";
import { Breadcrumbs, PageHeading } from "@/components/ui";
import { Cart } from "@/components/cart";
export default async function CartPage() {
  const [shop, website, context] = await Promise.all([
    shopRecords(),
    websiteContent(),
    getContext(),
  ]);
  const gate = !context
    ? {
        message: "Sign in to complete your purchase.",
        href: "/sign-in?next=/cart",
      }
    : !context.user.email_confirmed_at
      ? { message: "Verify your email before checkout.", href: "/verify-email" }
      : context.approval !== "approved"
        ? {
            message:
              context.approval === "pending"
                ? "Your account is awaiting approval."
                : "Your account is inactive. Contact the team.",
            href: "/workspace",
          }
        : context.progress.percent < 100
          ? {
              message: `Your profile is ${context.progress.percent}% complete. Complete it before checkout.`,
              href: "/workspace/profile",
            }
          : null;
  return (
    <main id="rh-main" className="rm-page rm-shell">
      <Breadcrumbs
        items={[{ label: "Shop", href: "/shop" }, { label: "Your cart" }]}
      />
      <PageHeading
        title="Your cart"
        description="Review your digital resources."
      />
      <Cart
        products={shop.products}
        gate={gate}
        policies={website.content.commerce || {}}
      />
    </main>
  );
}
