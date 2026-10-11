"use client";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

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
  const viewport = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState(1);
  const [duration, setDuration] = useState(30);
  const [ready, setReady] = useState(false);
  const [touch, setTouch] = useState(false);
  const moving = testimonials.length > 1;

  useLayoutEffect(() => {
    if (!moving || !viewport.current || !group.current) return;
    const measure = () => {
      const firstCard = group.current?.querySelector("figure");
      if (!firstCard || !viewport.current || !group.current) return;
      const gap = parseFloat(getComputedStyle(group.current).columnGap) || 0;
      const baseWidth =
        (firstCard.getBoundingClientRect().width + gap) * testimonials.length;
      if (!baseWidth) return;
      // Each half must cover the viewport, even when only two quotes exist.
      const needed = Math.max(
        1,
        Math.ceil(viewport.current.clientWidth / baseWidth),
      );
      setCopies(needed);
      setDuration(Math.max(20, (baseWidth * needed) / 28));
      setReady(true);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    observer.observe(group.current);
    return () => observer.disconnect();
  }, [moving, testimonials.length]);

  if (!testimonials.length) return null;
  const cards = (duplicate: boolean) =>
    Array.from({ length: copies }, (_, copy) =>
      testimonials.map((t) => (
        <figure
          key={`${copy}-${t.id}`}
          aria-hidden={duplicate || copy > 0 ? true : undefined}
          data-copy={copy > 0}
        >
          <blockquote>“{t.quote}”</blockquote>
          <figcaption>
            {t.attribution}
            {t.detail && <small>{t.detail}</small>}
          </figcaption>
        </figure>
      )),
    );

  return (
    <div
      ref={viewport}
      className="app-testimonials"
      role="region"
      aria-label="Testimonials"
      tabIndex={moving ? 0 : undefined}
      data-moving={moving}
      data-ready={ready}
      data-paused={touch}
      onTouchStart={() => setTouch(true)}
      onTouchEnd={(e) => setTouch(e.touches.length > 0)}
      onTouchCancel={() => setTouch(false)}
    >
      <div
        className="app-testimonial-track"
        style={{ "--testimonial-duration": `${duration}s` } as CSSProperties}
      >
        <div ref={group} className="app-testimonial-set">
          {cards(false)}
        </div>
        {moving && (
          <div className="app-testimonial-set" aria-hidden="true" inert>
            {cards(true)}
          </div>
        )}
      </div>
    </div>
  );
}
