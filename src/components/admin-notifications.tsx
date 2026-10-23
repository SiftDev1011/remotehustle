"use client";
import { useCallback, useEffect, useRef, useState, useId } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import type { AttentionItem } from "@/lib/attention";
export function AdminNotifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AttentionItem[] | null>(null);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const controller = useRef<AbortController | null>(null);
  const id = useId();
  const path = usePathname();
  const refresh = useCallback(async () => {
    controller.current?.abort();
    const request = new AbortController();
    controller.current = request;
    const timer = setTimeout(() => request.abort(), 12000);
    try {
      const response = await fetch("/api/admin/attention", {
        cache: "no-store",
        signal: request.signal,
      });
      if (!response.ok)
        throw new Error(
          response.status === 401
            ? "Your session expired. Please sign in again."
            : "Notifications couldn't load. Try again.",
        );
      const data = await response.json();
      if (controller.current === request) {
        setItems(data.items);
        setError("");
      }
    } catch (err) {
      if (controller.current === request)
        setError(
          err instanceof Error && err.name !== "AbortError"
            ? err.message
            : "Notifications couldn't load. Try again.",
        );
    } finally {
      clearTimeout(timer);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const visible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = setInterval(visible, 60000);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("admin-attention-refresh", visible);
    return () => {
      controller.current?.abort();
      controller.current = null;
      clearInterval(timer);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("admin-attention-refresh", visible);
    };
  }, [refresh, path]);
  useEffect(() => {
    setOpen(false);
  }, [path]);
  useEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  const active = (items || []).filter((item) => Number(item.total) > 0);
  const total = active.reduce((sum, item) => sum + Number(item.total), 0);
  return (
    <div
      className="app-notifications"
      ref={root}
      data-open={open}
      onBlur={(e) => {
        if (
          e.relatedTarget &&
          !e.currentTarget.contains(e.relatedTarget as Node)
        )
          setOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          setOpen(false);
          button.current?.focus();
        }
      }}
    >
      <button
        className="app-notification-button"
        type="button"
        ref={button}
        aria-label={
          error
            ? "Admin notifications unavailable"
            : `Admin notifications${items ? `, ${total} items need attention` : ", loading"}`
        }
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          setOpen(!open);
          if (!open) void refresh();
        }}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
        </svg>
        {(total > 0 || error) && (
          <span className="app-notification-count" aria-hidden="true">
            {error ? "!" : total > 99 ? "99+" : total}
          </span>
        )}
      </button>
      <section
        id={id}
        aria-label="Admin notifications"
        className="app-notification-panel"
        inert={!open}
      >
        <div className="app-notification-heading">
          <div>
            <strong>Needs attention</strong>
            <p>Tasks in your assigned areas</p>
          </div>
          <button
            type="button"
            aria-label="Close notifications"
            onClick={() => {
              setOpen(false);
              button.current?.focus();
            }}
          >
            ×
          </button>
        </div>
        <div className="app-notification-list">
          {error ? (
            <div className="app-notification-empty" role="status">
              <p>{error}</p>
              <button
                className="rm-text-link"
                type="button"
                onClick={() => void refresh()}
              >
                Retry
              </button>
            </div>
          ) : items === null ? (
            <p className="app-notification-empty" role="status">
              Loading…
            </p>
          ) : active.length ? (
            active.map((item) => (
              <Link
                href={item.href}
                key={item.key}
                onClick={() => setOpen(false)}
              >
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </div>
                <span className="app-badge">{item.total}</span>
              </Link>
            ))
          ) : (
            <p className="app-notification-empty">You're all caught up.</p>
          )}
        </div>
        <Link
          className="app-notification-footer"
          href="/admin/attention"
          onClick={() => setOpen(false)}
        >
          View all tasks
        </Link>
      </section>
    </div>
  );
}
