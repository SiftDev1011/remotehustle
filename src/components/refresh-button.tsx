"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefreshButton({ label = "Try again" }: { label?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="rm-text-link"
      disabled={pending}
      onClick={() => startTransition(() => router.refresh())}
    >
      {pending ? "Refreshing…" : label}
    </button>
  );
}
