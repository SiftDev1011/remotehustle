"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminNotifications } from "./admin-notifications";
import { CartCount } from "./cart";
import { signOutAction } from "@/actions/auth";

export function Navigation({
  signedIn,
  isAdmin,
}: {
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const wrapper = useRef<HTMLDivElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const header = wrapper.current?.querySelector("header");
    if (!header) return;
    const measure = () =>
      wrapper.current?.style.setProperty(
        "--app-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    const wide = matchMedia("(min-width: 881px)");
    const resize = () => {
      if (wide.matches) setOpen(false);
    };
    wide.addEventListener("change", resize);
    return () => wide.removeEventListener("change", resize);
  }, []);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const links = [
    { href: "/#rh-services", label: "Services" },
    { href: "/jobs", label: "Find work" },
    { href: "/programs", label: "Build skills" },
    { href: "/shop", label: "Shop" },
    { href: "/#rh-about", label: "About us" },
  ];
  return (
    <div
      ref={wrapper}
      className="app-navigation"
      onBlur={(event) => {
        if (
          event.relatedTarget &&
          !event.currentTarget.contains(event.relatedTarget as Node)
        )
          setOpen(false);
      }}
      data-open={open}
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          setOpen(false);
          menuButton.current?.focus();
        }
      }}
    >
      <header className="rh-header rh-shell">
        <Link className="rh-logo" href="/" aria-label="Remote Hustle home">
          <span className="rh-logo-mark" aria-hidden="true">
            ↗
          </span>
          <span>
            remote
            <br />
            hustle.
          </span>
        </Link>
        <nav className="rh-nav" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={path === link.href ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <CartCount />
        </nav>
        <div className="rh-account">
          {isAdmin && <AdminNotifications />}
          <Link
            className="rh-button rh-button-yellow"
            href={signedIn ? (isAdmin ? "/admin" : "/workspace") : "/sign-up"}
          >
            <span className="rh-full-label">
              {signedIn ? "Your workspace" : "Create your profile"}
            </span>
            <span className="rh-short-label">
              {signedIn ? "Workspace" : "Join now"}
            </span>
            <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <button
          ref={menuButton}
          className="rh-menu"
          type="button"
          aria-expanded={open}
          aria-controls="app-mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span className="app-menu-lines" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>
      {!path.startsWith("/admin") && <CartCount variant="floating" />}
      <div className="app-mobile-reveal" inert={!open}>
        <div className="app-mobile-inner">
          <nav
            id="app-mobile-menu"
            className="rh-mobile-nav"
            aria-label="Mobile navigation"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/cart" onClick={() => setOpen(false)}>
              Your cart
            </Link>
            <Link
              href={signedIn ? "/workspace" : "/sign-in"}
              onClick={() => setOpen(false)}
            >
              {signedIn ? "Your account" : "Sign in"}
            </Link>
            {signedIn && (
              <form action={signOutAction}>
                <button type="submit">Sign out</button>
              </form>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
