"use client";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
  reset: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
export function Captcha({ action = "auth" }: { action?: string }) {
  const sitekey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const container = useRef<HTMLDivElement>(null),
    widget = useRef<string | null>(null),
    wasPending = useRef(false);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false);
  const { pending } = useFormStatus();
  useEffect(() => {
    if (!ready || !container.current || !window.turnstile) return;
    widget.current = window.turnstile.render(container.current, {
      sitekey,
      action,
      theme: "light",
      size: "compact",
      "response-field-name": "captcha_token",
      "error-callback": () => setFailed(true),
      "expired-callback": () => {
        if (widget.current) window.turnstile?.reset(widget.current);
      },
      callback: () => setFailed(false),
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [ready, sitekey, action]);
  useEffect(() => {
    if (wasPending.current && !pending && widget.current)
      window.turnstile?.reset(widget.current);
    wasPending.current = pending;
  }, [pending]);
  if (!sitekey) return null;
  return (
    <div className="app-captcha">
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />
      <div ref={container} />
      {failed && (
        <p role="alert" className="rm-note">
          The security check could not load. Check your connection and reload
          this page.
        </p>
      )}
    </div>
  );
}
