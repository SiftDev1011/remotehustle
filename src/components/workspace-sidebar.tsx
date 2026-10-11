"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Chevron } from "./chevron";

export function WorkspaceSidebar({
  title,
  children,
  scrollable = false,
}: {
  title: string;
  children: ReactNode;
  scrollable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const path = usePathname();
  useEffect(() => {
    const query = matchMedia("(max-width: 880px)");
    const update = () => {
      setMobile(query.matches);
      setOpen(false);
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    setOpen(false);
    panel.current?.querySelectorAll("a").forEach((link) => {
      if (link.getAttribute("href") === path)
        link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }, [path]);
  return (
    <aside
      className="app-sidebar"
      aria-label={title}
      tabIndex={scrollable && !mobile ? 0 : undefined}
      data-open={open}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <p className="rm-eyebrow app-sidebar-title">{title}</p>
      <button
        ref={button}
        type="button"
        className="app-sidebar-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{title}</span>
        <Chevron />
      </button>
      <div
        id={id}
        ref={panel}
        className="app-sidebar-reveal"
        inert={mobile && !open}
      >
        <div
          className="app-sidebar-inner"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {children}
        </div>
      </div>
    </aside>
  );
}
