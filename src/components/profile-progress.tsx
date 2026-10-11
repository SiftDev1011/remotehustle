import Link from "next/link";
import { Disclosure } from "./disclosure";
import { applicationGate, type GateInput } from "@/lib/domain";
import type { Context } from "@/lib/auth";
import { Notice } from "./ui";

export function ProfileProgress({ context }: { context: Context }) {
  return (
    <div className="app-progress">
      <div>
        <strong>Profile completion</strong>
        <span>{context.progress.percent}%</span>
      </div>
      <progress
        max={100}
        value={context.progress.percent}
        aria-label="Profile completion"
      />
      {context.progress.missing.length > 0 && (
        <Disclosure
          label={`${context.progress.missing.length} ${context.progress.missing.length === 1 ? "detail" : "details"} to complete`}
        >
          <ul>
            {context.progress.missing.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </Disclosure>
      )}
    </div>
  );
}
export function AccountNotice({ context }: { context: Context }) {
  if (context.approval === "inactive")
    return (
      <Notice tone="error">
        Your account is inactive. Applications and profile changes are
        restricted. Contact the Remote Hustle team.
      </Notice>
    );
  if (!context.user.email_confirmed_at)
    return (
      <Notice>
        Please{" "}
        <Link className="rm-text-link" href="/verify-email">
          verify your email
        </Link>{" "}
        before applying.
      </Notice>
    );
  if (context.approval === "pending")
    return (
      <Notice>
        <strong>Pending approval.</strong> The team is reviewing your
        registration. You can complete your profile while you wait.
      </Notice>
    );
  return null;
}
export function gateInput(context: Context | null): GateInput {
  return {
    signedIn: !!context,
    verified: !!context?.user.email_confirmed_at,
    approval: context?.approval || null,
    profile: context?.profile || null,
    skillCount: context?.skillIds.length || 0,
    cvReady: context?.cv?.status === "ready",
  };
}
export function ApplicationGate({
  context,
  jobId,
}: {
  context: Context | null;
  jobId: string;
}) {
  const gate = applicationGate(gateInput(context));
  if (gate === "ready") return null;
  if (gate === "sign-in")
    return (
      <Notice>
        <Link
          className="rm-text-link"
          href={"/sign-in?next=" + encodeURIComponent("/jobs/" + jobId)}
        >
          Sign in
        </Link>{" "}
        or{" "}
        <Link className="rm-text-link" href="/sign-up">
          create your profile
        </Link>{" "}
        to apply.
      </Notice>
    );
  if (gate === "profile")
    return (
      <Notice>
        Complete your professional profile to apply.{" "}
        <Link className="rm-text-link" href="/workspace/profile">
          Finish your profile ({context!.progress.percent}%)
        </Link>
      </Notice>
    );
  return context && <AccountNotice context={context} />;
}
