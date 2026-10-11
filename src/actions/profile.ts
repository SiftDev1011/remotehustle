"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import {
  profileSchema,
  splitList,
  validationMessage,
  idSchema,
} from "@/lib/validation";
import { publicError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

export async function saveProfileAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireUser("/workspace/profile");
  const target = String(form.get("user_id") || context.user.id);
  if (!idSchema.safeParse(target).success)
    return { error: "Invalid profile identifier." };
  const result = profileSchema.safeParse({
    full_name: form.get("full_name"),
    phone: form.get("phone"),
    location_id: form.get("location_id") || null,
    category_id: form.get("category_id") || null,
    experience: form.get("experience"),
    education: form.get("education"),
    linkedin_url: form.get("linkedin_url"),
    preferred_roles: splitList(form.get("preferred_roles")),
    employment_preferences: form.getAll("employment_preferences"),
    interests: splitList(form.get("interests")),
    skill_ids: form.getAll("skill_ids"),
    marketing_consent: form.get("marketing_consent") === "on",
  });
  if (!result.success) return { error: validationMessage(result.error) };
  const { error } = await context.db.rpc("save_profile", {
    p_user_id: target,
    p_data: result.data,
  });
  if (error) return { error: publicError(error) };
  revalidatePath("/workspace");
  revalidatePath("/admin/users");
  return { success: "Profile saved." };
}
