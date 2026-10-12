"use client";
import { AutoScrollStrip } from "./auto-scroll-strip";
interface Testimonial {
  id: string;
  quote: string;
  attribution: string;
  detail: string;
}
export function TestimonialStrip({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  if (!testimonials.length) return null;
  return (
    <AutoScrollStrip
      count={testimonials.length}
      label="Testimonials"
      className="app-testimonials"
      trackClass="app-testimonial-track"
      groupClass="app-testimonial-set"
      renderItems={() =>
        testimonials.map((t) => (
          <figure key={t.id}>
            <blockquote>“{t.quote}”</blockquote>
            <figcaption>
              {t.attribution}
              {t.detail && <small>{t.detail}</small>}
            </figcaption>
          </figure>
        ))
      }
    />
  );
}
