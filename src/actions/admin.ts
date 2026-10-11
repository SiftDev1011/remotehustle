"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireArea, requireSuperAdmin } from "@/lib/auth";
import { serviceDb } from "@/lib/supabase/admin";
import { appUrl } from "@/lib/env";
import {
  idSchema,
  adminInviteSchema,
  validationMessage,
} from "@/lib/validation";
import { ADMIN_AREAS } from "@/lib/domain";
import { publicError } from "@/lib/errors";
import { deliverOutbox } from "@/lib/email/outbox";
import type { ActionState } from "@/lib/action-state";
import { redirect } from "next/navigation";

export async function deleteWorkerAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("users");
  const id = idSchema.safeParse(form.get("user_id"));
  if (!id.success) return { error: "Invalid user identifier." };
  const record = await context.db
    .from("profiles")
    .select("email")
    .eq("user_id", id.data)
    .single();
  if (
    record.error ||
    !record.data ||
    form.get("confirm_email") !== record.data.email
  )
    return { error: "Type this user’s email address to confirm deletion." };
  const check = await context.db.rpc("assert_worker_deletion", {
    p_user_id: id.data,
  });
  if (check.error) return { error: publicError(check.error) };
  try {
    const { error } = await serviceDb().auth.admin.deleteUser(id.data);
    if (error)
      return {
        error: "Unable to delete the account. Check the server connection.",
      };
  } catch (error) {
    return { error: publicError(error) };
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?deleted=1");
}

export async function approvalAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("users");
  const id = idSchema.safeParse(form.get("user_id"));
  const status = z
    .enum(["pending", "approved", "inactive"])
    .safeParse(form.get("approval"));
  if (!id.success || !status.success)
    return { error: "Choose a valid user and status." };
  const { error } = await context.db.rpc("set_worker_approval", {
    p_user_id: id.data,
    p_status: status.data,
  });
  if (error) return { error: publicError(error) };
  revalidatePath("/admin/users");
  after(async () => {
    try {
      await deliverOutbox();
    } catch {
      console.error("Email delivery will be retried by the scheduled job.");
    }
  });
  return { success: "Account status updated." };
}
export async function inviteAdminAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireSuperAdmin();
  const result = adminInviteSchema.safeParse({
    email: form.get("email"),
    full_name: form.get("full_name"),
    areas: form.getAll("areas"),
  });
  if (!result.success) return { error: validationMessage(result.error) };
  try {
    const admin = serviceDb();
    const { data, error } = await admin.auth.admin.inviteUserByEmail(
      result.data.email,
      {
        data: { full_name: result.data.full_name },
        redirectTo: appUrl() + "/auth/confirm?next=/reset-password",
      },
    );
    if (error || !data.user)
      return {
        error:
          "Unable to invite this administrator. Check whether the email is already registered and whether SMTP is configured.",
      };
    const grant = await context.db.rpc("set_admin_access", {
      p_user_id: data.user.id,
      p_areas: result.data.areas,
      p_active: true,
    });
    if (grant.error) {
      // Failure cannot leave an invited account with unintended privileges.
      await admin.auth.admin.deleteUser(data.user.id);
      return { error: publicError(grant.error) };
    }
    revalidatePath("/admin/administrators");
    return {
      success:
        "Administrator invited. They can set a password using the email link.",
    };
  } catch (error) {
    return { error: publicError(error) };
  }
}
export async function adminAccessAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireSuperAdmin();
  const result = z
    .object({
      user_id: idSchema,
      areas: z.array(z.enum(ADMIN_AREAS)).min(1),
      active: z.boolean(),
    })
    .safeParse({
      user_id: form.get("user_id"),
      areas: form.getAll("areas"),
      active: form.get("active") === "on",
    });
  if (!result.success) return { error: validationMessage(result.error) };
  const { error } = await context.db.rpc("set_admin_access", {
    p_user_id: result.data.user_id,
    p_areas: result.data.areas,
    p_active: result.data.active,
  });
  if (error) return { error: publicError(error) };
  revalidatePath("/admin/administrators");
  return { success: "Administrator access updated." };
}
export async function listAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("jobs");
  const result = z
    .object({
      table: z.enum(["job_categories", "skills", "locations"]),
      name: z.string().trim().min(2).max(100),
      id: idSchema.nullable(),
    })
    .safeParse({
      table: form.get("table"),
      name: form.get("name"),
      id: form.get("id") || null,
    });
  if (!result.success) return { error: validationMessage(result.error) };
  const record = {
    name: result.data.name,
    active: form.get("active") === "on",
  };
  const query = result.data.id
    ? context.db.from(result.data.table).update(record).eq("id", result.data.id)
    : context.db.from(result.data.table).insert(record);
  const { error } = await query;
  if (error) return { error: publicError(error) };
  revalidatePath("/admin/lists");
  revalidatePath("/workspace/profile");
  return { success: "List updated." };
}
export async function removeListAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("jobs");
  const result = z
    .object({
      table: z.enum(["job_categories", "skills", "locations"]),
      id: idSchema,
    })
    .safeParse({ table: form.get("table"), id: form.get("id") });
  if (!result.success) return { error: "Invalid list record." };
  const { error } = await context.db
    .from(result.data.table)
    .delete()
    .eq("id", result.data.id);
  if (error) return { error: publicError(error) };
  revalidatePath("/admin/lists");
  return { success: "Record removed." };
}
