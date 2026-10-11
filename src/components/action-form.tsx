"use client";
import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { ActionState } from "@/lib/action-state";

export function ActionForm({
  action,
  children,
  label = "Save changes",
  className = "",
  refresh = true,
  danger = false,
}: {
  action: (previous: ActionState, form: FormData) => Promise<ActionState>;
  children: ReactNode;
  label?: string;
  className?: string;
  refresh?: boolean;
  danger?: boolean;
}) {
  const [state, dispatch, pending] = useActionState(
    async (previous: ActionState, form: FormData) => {
      const result = await action(previous, form);
      // Dispatch before state changes can remove a resolved item and unmount its form.
      if (result.success)
        window.dispatchEvent(new Event("admin-attention-refresh"));
      return result;
    },
    {},
  );
  const router = useRouter();
  useEffect(() => {
    if (state.success) {
      if (refresh) router.refresh();
    }
  }, [state.success, refresh, router]);
  return (
    <form action={dispatch} className={"app-form " + className}>
      <fieldset disabled={pending} className="app-form-fields">
        {children}
        <button
          className={"rm-btn " + (danger ? "rm-btn-danger" : "")}
          type="submit"
        >
          {pending ? "Working…" : label}
        </button>
      </fieldset>
      {state.error && (
        <p className="app-form-error" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="app-form-success" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
