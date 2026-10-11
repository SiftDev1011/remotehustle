"use server";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { requireArea, requireSuperAdmin } from "@/lib/auth";
import type { ActionState } from "@/lib/action-state";
import { deliverOutbox } from "@/lib/email/outbox";
export async function reviewContactAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("content");
  const data = z
    .object({
      id: z.uuid(),
      status: z.enum(["new", "in_progress", "resolved", "spam"]),
      note: z.string().trim().max(2000),
    })
    .safeParse({
      id: form.get("id"),
      status: form.get("status"),
      note: form.get("note"),
    });
  if (!data.success) return { error: "Check the message status and note." };
  const { error } = await context.db.rpc("review_contact", {
    p_id: data.data.id,
    p_status: data.data.status,
    p_note: data.data.note,
  });
  if (error) return { error: "Unable to save this message. Please try again." };
  revalidatePath("/admin/messages");
  return {
    success: "Message updated. Notes are internal; send your reply by email.",
  };
}
export async function retryEmailAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireSuperAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  if (!id.success || form.get("confirm") !== "on")
    return { error: "Confirm that you checked the provider delivery log." };
  const { error } = await context.db.rpc("retry_failed_email", {
    p_id: id.data,
  });
  if (error) return { error: "Only failed messages can be queued again." };
  after(async () => {
    try {
      await deliverOutbox();
    } catch {
      console.error("[email] Retry remains queued for scheduled delivery.");
    }
  });
  revalidatePath("/admin/operations");
  return {
    success:
      "Email queued for another delivery attempt. Refresh to check its status.",
  };
}
