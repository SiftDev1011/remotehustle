export type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};
export type HelpSource = {
  id: string;
  title: string;
  text: string;
  href: string;
};
export type HelpAnswer = {
  answer: string;
  sources: { title: string; href: string }[];
  mode: "ai" | "faq";
  notice?: string;
};
const stopwords = new Set(
  "a an and are as at be can do for from how i in is it me my of on or the to use what when where which why with you your".split(
    " ",
  ),
);
function words(value: string) {
  return [
    ...new Set(
      value
        .toLocaleLowerCase()
        .normalize("NFKC")
        .match(/[\p{L}\p{N}]{2,}/gu) || [],
    ),
  ].filter((w) => !stopwords.has(w));
}
export function relevantSources(
  question: string,
  sources: HelpSource[],
): HelpSource[] {
  const terms = words(question);
  return sources
    .map((source, index) => {
      const title = words(source.title),
        body = words(source.text);
      return {
        source,
        index,
        score: terms.reduce(
          (sum, t) =>
            sum + (title.includes(t) ? 4 : 0) + (body.includes(t) ? 1 : 0),
          0,
        ),
      };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 8)
    .map((x) => x.source);
}
export function faqSources(faqs: Faq[]): HelpSource[] {
  return faqs.map((f) => ({
    id: "faq-" + f.id,
    title: f.question,
    text: f.answer,
    href: "/faq#faq-" + f.id,
  }));
}
export function faqFallback(
  question: string,
  sources: HelpSource[],
  notice?: string,
): HelpAnswer {
  const relevant = relevantSources(question, sources).filter((s) =>
    s.id.startsWith("faq-"),
  );
  return relevant.length
    ? {
        answer: relevant[0].text,
        sources: relevant
          .slice(0, 3)
          .map(({ title, href }) => ({ title, href })),
        mode: "faq",
        notice,
      }
    : {
        answer:
          "I couldn’t find a published answer to that question. Browse the FAQs or contact the team for help with your situation.",
        sources: [
          { title: "Browse FAQs", href: "/faq" },
          { title: "Contact the team", href: "/about#contact" },
        ],
        mode: "faq",
        notice,
      };
}
