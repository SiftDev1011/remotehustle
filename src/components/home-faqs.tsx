import Link from "next/link";
import { publishedFaqs } from "@/lib/faqs";
import { FaqList } from "./faq-list";
export async function HomeFaqs() {
  // Optional content must not turn a healthy homepage into an error page.
  const faqs = await publishedFaqs().catch(() => []);
  if (!faqs.length) return null;
  return (
    <section
      className="rh-shell app-home-faq"
      aria-labelledby="home-faq-heading"
    >
      <div className="app-search-group-head">
        <h2 id="home-faq-heading">A few things you might ask.</h2>
        <Link href="/faq" className="rm-text-link">
          All FAQs
        </Link>
      </div>
      <FaqList faqs={faqs.slice(0, 4)} />
    </section>
  );
}
