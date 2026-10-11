"use client";
import Link from "next/link";
import { useTransition } from "react";

export function PageFailure({
  retry,
  workspace = false,
}: {
  retry: () => void;
  workspace?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <main
      id="rh-main"
      className={
        "rm-page rm-shell " + (workspace ? "app-workspace-main" : "rm-narrow")
      }
    >
      <span className="rm-eyebrow">Unable to load this page</span>
      <h1>Let’s try that again.</h1>
      <p className="rm-note">
        The connection may have been interrupted. Wait a moment, then try again.
        If this keeps happening, contact the Remote Hustle team.
      </p>
      <div className="rm-actions">
        <button
          className="rm-btn"
          disabled={pending}
          aria-busy={pending}
          onClick={() => startTransition(() => retry())}
        >
          {pending ? "Trying again…" : "Try again"}
        </button>
        <Link className="rm-text-link" href="/sign-in">
          Go to sign in
        </Link>
      </div>
    </main>
  );
}
