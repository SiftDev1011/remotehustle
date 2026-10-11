import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { serverDb } from "./supabase/server";
import { supabaseConfigured } from "./env";
import {
  canManage,
  profileProgress,
  type AdminArea,
  type Approval,
  type CvDocument,
  type Membership,
  type Profile,
} from "./domain";

export const getContext = cache(async function getContext() {
  if (!supabaseConfigured()) return null;
  const db = await serverDb();
  // getUser checks the Auth server; cookie contents alone never determine identity.
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (
    error &&
    (error.status === 0 ||
      (error.status || 0) >= 500 ||
      error.name === "AuthRetryableFetchError")
  ) {
    // Fail closed, but don't mislabel a temporary outage as an expired session.
    throw new Error("Account service temporarily unavailable.");
  }
  if (error || !user) return null;
  const [profileResult, accountResult, membershipResult, skillResult] =
    await Promise.all([
      db.from("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db
        .from("worker_accounts")
        .select("approval")
        .eq("user_id", user.id)
        .maybeSingle(),
      db
        .from("admin_memberships")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      db.from("profile_skills").select("skill_id").eq("user_id", user.id),
    ]);
  if (
    profileResult.error ||
    accountResult.error ||
    membershipResult.error ||
    skillResult.error
  ) {
    throw new Error("The database connection or migration needs attention.");
  }
  const profile = profileResult.data as Profile | null;
  let cv: CvDocument | null = null;
  if (profile?.cv_id) {
    const result = await db
      .from("cv_documents")
      .select("*")
      .eq("id", profile.cv_id)
      .maybeSingle();
    if (result.error) throw new Error("Unable to load CV information.");
    cv = result.data as CvDocument | null;
  }
  const skillIds = (skillResult.data || []).map((x) => x.skill_id as string);
  return {
    db,
    user,
    profile,
    approval: (accountResult.data?.approval || "pending") as Approval,
    membership: membershipResult.data as Membership | null,
    skillIds,
    cv,
    progress: profileProgress(profile, skillIds.length, cv?.status === "ready"),
  };
});
export type Context = NonNullable<Awaited<ReturnType<typeof getContext>>>;
export async function requireUser(next = "/workspace") {
  const context = await getContext();
  if (!context)
    redirect("/sign-in?reason=session&next=" + encodeURIComponent(next));
  return context;
}
export async function requireArea(area: AdminArea) {
  const context = await requireUser("/admin");
  if (
    !context.user.email_confirmed_at ||
    context.approval === "inactive" ||
    !canManage(context.membership, area)
  )
    redirect("/access-denied");
  return context;
}
export async function requireSuperAdmin() {
  const context = await requireUser("/admin/administrators");
  if (
    !context.user.email_confirmed_at ||
    context.approval === "inactive" ||
    context.membership?.role !== "super_admin" ||
    !context.membership.active
  )
    redirect("/access-denied");
  return context;
}
