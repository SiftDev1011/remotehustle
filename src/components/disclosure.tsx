"use client";
import { useId, useState, type ReactNode } from "react";
import { Chevron } from "./chevron";

export function Disclosure({
  label,
  children,
  className = "",
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <section className={"app-disclosure " + className} data-open={open}>
      <button
        type="button"
        className="app-disclosure-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        <Chevron />
      </button>
      <div id={id} className="app-reveal" inert={!open}>
        <div className="app-reveal-inner">{children}</div>
      </div>
    </section>
  );
}
