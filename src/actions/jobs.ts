"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireArea, requireUser } from "@/lib/auth";
import {
  applicationSchema,
  jobSchema,
  validationMessage,
  idSchema,
  applicationStatusSchema,
} from "@/lib/validation";
import { publicError } from "@/lib/errors";
import { deliverOutbox } from "@/lib/email/outbox";
import type { ActionState } from "@/lib/action-state";

export async function deleteJobAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("jobs");
  const id = idSchema.safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "on")
    return { error: "Confirm the job deletion." };
  const { error } = await context.db.rpc("delete_job", { p_id: id.data });
  if (error)
    return {
      error: error.message.startsWith("This job has applicants")
        ? error.message
        : publicError(error),
    };
  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  revalidatePath("/");
  return { success: "Job removed." };
}

export async function applyAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireUser("/jobs/" + String(form.get("job_id")));
  const result = applicationSchema.safeParse({
    job_id: form.get("job_id"),
    cover_note: form.get("cover_note") || "",
  });
  if (!result.success) return { error: validationMessage(result.error) };
  const { data, error } = await context.db.rpc("submit_application", {
    p_job_id: result.data.job_id,
    p_cover_note: result.data.cover_note,
  });
  if (error) return { error: publicError(error) };
  revalidatePath("/workspace");
  revalidatePath("/jobs/" + result.data.job_id);
  return {
    success: "Application submitted. Track its status in your workspace.",
    id: data as string,
  };
}
export async function saveJobAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("jobs");
  const id = form.get("id") || null;
  if (id && !idSchema.safeParse(id).success)
    return { error: "Invalid job identifier." };
  const number = (key: string) =>
    form.get(key) === "" || form.get(key) == null
      ? null
      : Number(form.get(key));
  let closes: string | null = null;
  if (form.get("closes_at")) {
    const date = new Date(String(form.get("closes_at")));
    if (Number.isNaN(date.getTime()))
      return { error: "Enter a valid closing date." };
    closes = date.toISOString();
  }
  const result = jobSchema.safeParse({
    title: form.get("title"),
    company: form.get("company"),
    description: form.get("description"),
    requirements: form.get("requirements"),
    category_id: form.get("category_id") || null,
    location_id: form.get("location_id") || null,
    employment_type: form.get("employment_type"),
    application_type: form.get("application_type"),
    application_url: form.get("application_url") || null,
    salary_min: number("salary_min"),
    salary_max: number("salary_max"),
    currency: form.get("currency"),
    salary_period: form.get("salary_period"),
    status: form.get("status"),
    closes_at: closes,
  });
  if (!result.success) return { error: validationMessage(result.error) };
  const { error } = await context.db.rpc("save_job", {
    p_id: id,
    p_data: result.data,
  });
  if (error) return { error: publicError(error) };
  revalidatePath("/");
  revalidatePath("/jobs");
  revalidatePath("/admin/jobs");
  redirect("/admin/jobs?saved=1");
}
export async function applicationStatusAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("jobs");
  const id = idSchema.safeParse(form.get("id"));
  const status = applicationStatusSchema.safeParse(form.get("status"));
  if (!id.success || !status.success)
    return { error: "Choose a valid application and status." };
  const { error } = await context.db.rpc("set_application_status", {
    p_id: id.data,
    p_status: status.data,
  });
  if (error) return { error: publicError(error) };
  revalidatePath("/admin/applicants");
  revalidatePath("/workspace");
  after(async () => {
    try {
      await deliverOutbox();
    } catch {
      console.error("Email delivery will be retried by the scheduled job.");
    }
  });
  return { success: "Status saved. The notification is queued for delivery." };
}
