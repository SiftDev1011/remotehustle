import Link from "next/link";
import { publishedFaqs } from "@/lib/faqs";
import { publicMetadata } from "@/lib/seo";
import { Breadcrumbs, PageHeading, EmptyState } from "@/components/ui";
import { FaqList } from "@/components/faq-list";
export function generateMetadata() {
  return publicMetadata(
    "Frequently asked questions",
    "Answers about accounts, applications, programmes and digital purchases on REMOTE HUSTLE.",
    "/faq",
  );
}
export default async function FaqPage() {
  const faqs = await publishedFaqs();
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <Breadcrumbs items={[{ label: "FAQs" }]} />
      <PageHeading title="Frequently asked questions" />
      <FaqList faqs={faqs} />
      {!faqs.length && <EmptyState title="More answers are on the way." />}
      <p className="app-faq-contact">
        Still need help? <Link href="/about#contact">Contact the team.</Link>
      </p>
    </main>
  );
}
