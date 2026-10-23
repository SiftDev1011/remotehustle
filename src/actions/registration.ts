"use server";
import { normalizeInternationalPhone } from "@/lib/international-phone";
import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, requireArea } from "@/lib/auth";
import { registrationSchema } from "@/lib/registration";
import { publicError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";
const hash = (code: string) =>
  createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
export async function submitRegistrationAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireUser("/registration");
  if (!context.user.email_confirmed_at || context.approval === "inactive")
    return {
      error: "Verify your email and use an active account to register.",
    };
  const raw: Record<string, unknown> = Object.fromEntries(form);
  for (const key of [
    "whatsapp_active",
    "performance_agreement",
    "community_agreement",
    "privacy_acknowledged",
  ])
    raw[key] = form.get(key) === "on";
  try {
    raw.phone = normalizeInternationalPhone(
      raw.phone,
      raw.phone_country || "NG",
    );
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Check your phone number.",
    };
  }
  const parsed = registrationSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { access_code, category_id, ...data } = parsed.data;
  const result = await context.db.rpc("submit_programme_registration", {
    p_category: category_id,
    p_hash: hash(access_code),
    p_data: data,
  });
  if (result.error) return { error: publicError(result.error) };
  if (result.data?.error) return { error: String(result.data.error) };
  if (!result.data?.id)
    return {
      error: "Your registration could not be confirmed. Please try again.",
    };
  revalidatePath("/registration");
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/attention");
  return {
    success: "Registration received. Keep your reference for any enquiries.",
    id: result.data.id,
  };
}
export async function createRegistrationCodeAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const c = await requireArea("users");
  const parsed = z
    .object({
      label: z.string().trim().min(2).max(120),
      max: z.number().int().min(1).max(100000).nullable(),
      expires: z.iso.date().nullable(),
    })
    .safeParse({
      label: form.get("label"),
      max: form.get("max_uses") ? Number(form.get("max_uses")) : null,
      expires: form.get("expires_at") || null,
    });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const expires = parsed.data.expires
    ? new Date(parsed.data.expires + "T23:59:59+01:00").toISOString()
    : null;
  if (expires && Date.parse(expires) <= Date.now())
    return { error: "Choose a future expiry date." };
  const code = "RH1-" + randomBytes(16).toString("hex").toUpperCase();
  const r = await c.db.rpc("create_registration_code", {
    p_label: parsed.data.label,
    p_hash: hash(code),
    p_max: parsed.data.max,
    p_expires: expires,
  });
  if (r.error) return { error: publicError(r.error) };
  revalidatePath("/admin/registrations");
  return { success: "Copy this code now; it will not be shown again: " + code };
}
export async function toggleRegistrationCodeAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const c = await requireArea("users"),
    id = String(form.get("id"));
  if (!z.uuid().safeParse(id).success) return { error: "Invalid code." };
  const r = await c.db.rpc("set_registration_code_active", {
    p_id: id,
    p_active: form.get("active") === "true",
  });
  if (r.error) return { error: publicError(r.error) };
  revalidatePath("/admin/registrations");
  return { success: "Code updated." };
}
export async function reviewRegistrationAction(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const c = await requireArea("users"),
    id = String(form.get("id"));
  if (!z.uuid().safeParse(id).success)
    return { error: "Invalid registration." };
  const r = await c.db.rpc("review_programme_registration", {
    p_id: id,
    p_reviewed: form.get("reviewed") === "true",
  });
  if (r.error) return { error: publicError(r.error) };
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/attention");
  revalidatePath("/registration");
  return { success: "Review status updated." };
}
