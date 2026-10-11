import { Dropdown } from "@/components/dropdown";
import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeading({
  eyebrow,
  title,
  description,
  spacious = false,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  spacious?: boolean;
}) {
  return (
    <div
      className={"rm-page-head" + (spacious ? "" : " app-page-head-compact")}
    >
      <div>
        {eyebrow && <span className="rm-eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
}
export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="rm-breadcrumb" aria-label="Breadcrumb">
      <ol>
        <li>
          <Link href="/">Home</Link>
        </li>
        {items.map((item, i) => (
          <li key={i}>
            {item.href ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span className="rm-breadcrumb-current" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="app-empty">
      <span className="app-empty-icon" aria-hidden="true">
        ↗
      </span>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Notice({
  children,
  tone = "info",
}: {
  children: ReactNode;
  tone?: "info" | "error" | "success";
}) {
  return (
    <div
      className={"app-notice app-notice-" + tone}
      role={tone === "error" ? "alert" : undefined}
    >
      {children}
    </div>
  );
}
export function ConfigurationNotice() {
  return (
    <Notice>
      Account registration and sign-in are temporarily unavailable. Please check
      back soon.
    </Notice>
  );
}
export function Input({
  label,
  name,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  name: string;
}) {
  return (
    <div className="app-field">
      <label htmlFor={props.id || name}>{label}</label>
      <input id={name} name={name} {...props} />
    </div>
  );
}
export function TextArea({
  label,
  name,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  name: string;
}) {
  return (
    <div className="app-field">
      <label htmlFor={props.id || name}>{label}</label>
      <textarea id={name} name={name} {...props} />
    </div>
  );
}
export function Select({
  label,
  name,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  name: string;
}) {
  return (
    <div className="app-field">
      <label htmlFor={props.id || name}>{label}</label>
      <Dropdown id={name} name={name} aria-label={label} {...props}>
        {children}
      </Dropdown>
    </div>
  );
}
export function Badge({ children }: { children: ReactNode }) {
  return <span className="app-badge">{children}</span>;
}
