import { Disclosure } from "./disclosure";
import type { Faq } from "@/lib/help";
export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="app-faq-list">
      {faqs.map((f) => (
        <div key={f.id} id={"faq-" + f.id} className="app-faq-item">
          <Disclosure label={f.question}>
            <p className="app-preline">{f.answer}</p>
          </Disclosure>
        </div>
      ))}
    </div>
  );
}
