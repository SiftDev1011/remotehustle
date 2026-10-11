"use client";
import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function AdminFrame({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const search = useSearchParams().toString();

  useLayoutEffect(() => {
    const navigation = document.querySelector<HTMLElement>(".app-navigation");
    if (!navigation) return;
    const measure = () =>
      frame.current?.style.setProperty(
        "--app-nav-height",
        `${navigation.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    // Each destination (including filters and edit screens) starts at its heading.
    // Keep the sidebar's own scroll position so its active link remains nearby.
    content.current?.scrollTo({ top: 0, left: 0, behavior: "instant" });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [path, search]);

  return (
    <div ref={frame} className="app-workspace app-admin-frame">
      {sidebar}
      <div
        ref={content}
        className="app-admin-content"
        role="region"
        aria-label="Admin page content"
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}
