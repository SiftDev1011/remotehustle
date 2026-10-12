"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Native scrolling keeps touch momentum, trackpads and keyboard navigation usable. */
export function AutoScrollStrip({
  count,
  label,
  className,
  trackClass,
  groupClass,
  renderItems,
}: {
  count: number;
  label: string;
  className: string;
  trackClass: string;
  groupClass: string;
  renderItems: (duplicate: boolean) => ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const interaction = useRef({
    contact: false,
    touch: false,
    hover: false,
    focus: false,
    until: 0,
  });
  const moving = count > 1;
  useEffect(() => {
    const element = viewport.current,
      set = group.current;
    if (!element || !set) return;
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      position = 0,
      previous = 0,
      frame = 0,
      expected = -1;
    const write = (value: number) => {
      element.scrollLeft = value;
      expected = element.scrollLeft;
    };
    const measure = () => {
      const nextWidth = set.getBoundingClientRect().width;
      const offset = width ? ((element.scrollLeft % width) + width) % width : 0;
      width = nextWidth;
      position =
        moving && !preference.matches ? width + Math.min(offset, width - 1) : 0;
      write(position);
    };
    const scroll = () => {
      // Programmatic autoplay writes must not count as a fresh user gesture.
      if (Math.abs(element.scrollLeft - expected) > 1) {
        interaction.current.until = performance.now() + 1200;
        position = element.scrollLeft;
      }
    };
    const release = () => {
      interaction.current.contact = false;
      interaction.current.until = performance.now() + 1200;
    };
    const tick = (now: number) => {
      const elapsed = previous ? Math.min(now - previous, 50) : 0;
      previous = now;
      const state = interaction.current;
      if (
        moving &&
        width &&
        !preference.matches &&
        !document.hidden &&
        !state.contact &&
        !state.touch &&
        !state.hover &&
        !state.focus &&
        now >= state.until
      ) {
        // Move back to the identical middle set at either loop boundary.
        position = width + (((position % width) + width) % width);
        position += elapsed * 0.028;
        write(position);
      }
      frame = requestAnimationFrame(tick);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(set);
    element.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    preference.addEventListener("change", measure);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("scroll", scroll);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      preference.removeEventListener("change", measure);
    };
  }, [moving, count]);
  return (
    <div
      ref={viewport}
      className={className + " app-swipe-strip"}
      role="region"
      aria-label={label}
      tabIndex={moving ? 0 : undefined}
      data-swipe-strip
      data-moving={moving}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") interaction.current.hover = true;
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") interaction.current.hover = false;
      }}
      onPointerDown={() => {
        interaction.current.contact = true;
      }}
      onTouchStart={() => {
        interaction.current.touch = true;
      }}
      onTouchEnd={(e) => {
        interaction.current.touch = e.touches.length > 0;
        interaction.current.until = performance.now() + 1200;
      }}
      onTouchCancel={() => {
        interaction.current.touch = false;
        interaction.current.until = performance.now() + 1200;
      }}
      onFocusCapture={(e) => {
        interaction.current.focus = e.target.matches(":focus-visible");
      }}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget))
          interaction.current.focus = false;
      }}
      onWheel={() => {
        interaction.current.until = performance.now() + 1200;
      }}
      onKeyDown={(e) => {
        interaction.current.focus = true;
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
          e.preventDefault();
          viewport.current?.scrollBy({
            left:
              (e.key === "ArrowRight" ? 1 : -1) *
              viewport.current.clientWidth *
              0.7,
            behavior: "auto",
          });
        }
      }}
    >
      <div className={trackClass + " app-swipe-track"}>
        {moving && (
          <div className={groupClass + " app-swipe-set"} aria-hidden="true">
            {renderItems(true)}
          </div>
        )}
        <div ref={group} className={groupClass + " app-swipe-set"}>
          {renderItems(false)}
        </div>
        {moving && (
          <div className={groupClass + " app-swipe-set"} aria-hidden="true">
            {renderItems(true)}
          </div>
        )}
      </div>
    </div>
  );
}
