"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireArea } from "@/lib/auth";
import { managedSection, management, minorAmount } from "@/lib/management";
import { publicError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";
const url = z.string().url().startsWith("https://").nullable();
const text = (min = 0, max = 8000) => z.string().trim().min(min).max(max);
export async function saveManagedAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const section = String(form.get("section"));
  if (!managedSection(section)) return { error: "Unknown management area." };
  const config = management[section],
    context = await requireArea(config.area);
  const id = String(form.get("id") || "");
  if (id && !z.uuid().safeParse(id).success)
    return { error: "Invalid record." };
  const s = (key: string) => String(form.get(key) || "").trim();
  const u = (key: string) => s(key) || null;
  const b = (key: string) => form.get(key) === "on";
  try {
    let data: Record<string, unknown>;
    if (section === "product-categories")
      data = z
        .object({ name: text(2, 100), active: z.boolean() })
        .parse({ name: s("name"), active: b("active") });
    else if (section === "partners")
      data = z
        .object({
          name: text(2, 180),
          logo_url: url,
          website_url: url,
          active: z.boolean(),
          sort_order: z.number().int().min(0).max(9999),
        })
        .parse({
          name: s("name"),
          logo_url: u("logo_url"),
          website_url: u("website_url"),
          active: b("active"),
          sort_order: Number(s("sort_order")),
        });
    else if (section === "programs")
      data = z
        .object({
          title: text(3, 180),
          description: text(10),
          type: z.enum(["training", "internship"]),
          link: url,
          image_url: url,
          starts_on: z.iso.date().nullable(),
          duration: text(0, 120),
          published: z.boolean(),
        })
        .parse({
          title: s("title"),
          description: s("description"),
          type: s("type"),
          link: u("link"),
          image_url: u("image_url"),
          starts_on: u("starts_on"),
          duration: s("duration"),
          published: b("published"),
        });
    else if (section === "products") {
      data = z
        .object({
          name: text(2, 160),
          description: text(10),
          type: z.literal("digital"),
          price_minor: z.number().int().min(100).max(100000000),
          image_url: url,
          active: z.boolean(),
          category_id: z.uuid().nullable(),
        })
        .parse({
          name: s("name"),
          description: s("description"),
          type: s("type"),
          price_minor: minorAmount(s("price")),
          image_url: u("image_url"),
          active: b("active"),
          category_id: u("category_id"),
        });
      const asset = u("asset_id");
      if (asset && !z.uuid().safeParse(asset).success)
        return { error: "Choose a valid digital file." };
      const result = await context.db.rpc("save_product", {
        p_id: id || null,
        p_data: data,
        p_asset: asset,
      });
      if (result.error)
        return {
          error: /^(Upload a digital|Choose an active product)/.test(
            result.error.message,
          )
            ? result.error.message
            : publicError(result.error),
        };
      revalidatePath("/shop");
      revalidatePath("/");
      revalidatePath("/admin/products");
      redirect("/admin/products?saved=1");
    } else if (section === "discounts")
      data = z
        .object({
          code: text(3, 32).regex(/^[A-Z0-9_-]+$/),
          type: z.enum(["percent", "fixed"]),
          value: z.number().int().positive().max(100000000),
          minimum_minor: z.number().int().min(0).max(100000000),
          starts_at: z.iso.datetime(),
          expires_at: z.iso.datetime().nullable(),
          active: z.boolean(),
        })
        .refine((d) => d.type !== "percent" || d.value <= 100, {
          message: "A percentage must be between 1 and 100.",
        })
        .refine((d) => !d.expires_at || d.expires_at > d.starts_at, {
          message: "Expiry must follow the start time.",
        })
        .parse({
          code: s("code").toUpperCase(),
          type: s("type"),
          value:
            s("type") === "percent"
              ? Number(s("value"))
              : minorAmount(s("value")),
          minimum_minor: minorAmount(s("minimum") || "0"),
          starts_at: s("starts_at")
            ? new Date(s("starts_at") + "Z").toISOString()
            : new Date().toISOString(),
          expires_at: s("expires_at")
            ? new Date(s("expires_at") + "Z").toISOString()
            : null,
          active: b("active"),
        });
    else if (section === "testimonials")
      data = z
        .object({
          quote: text(10, 2000),
          attribution: text(2, 160),
          detail: text(0, 200),
          consent_confirmed: z.boolean(),
          published: z.boolean(),
        })
        .refine((d) => !d.published || d.consent_confirmed, {
          message: "Confirm permission before publishing this testimonial.",
        })
        .parse({
          quote: s("quote"),
          attribution: s("attribution"),
          detail: s("detail"),
          consent_confirmed: b("consent_confirmed"),
          published: b("published"),
        });
    else
      data = z
        .object({
          label: text(2, 120),
          value: text(1, 40),
          evidence_note: text(1, 2000),
          published: z.boolean(),
        })
        .parse({
          label: s("label"),
          value: s("value"),
          evidence_note: s("evidence_note"),
          published: b("published"),
        });
    const result = id
      ? await context.db
          .from(config.table)
          .update(data)
          .eq("id", id)
          .select("id")
          .single()
      : await context.db.from(config.table).insert(data).select("id").single();
    if (result.error) return { error: publicError(result.error) };
  } catch (e) {
    if (e instanceof z.ZodError) return { error: e.issues[0].message };
    if (e instanceof Error && e.message.startsWith("NEXT_REDIRECT")) throw e;
    return {
      error:
        e instanceof Error && e.message.startsWith("Enter a valid")
          ? e.message
          : "Check the form fields and try again.",
    };
  }
  revalidatePath("/", "layout");
  redirect("/admin/" + section + "?saved=1");
}
export async function deleteManagedAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const section = String(form.get("section"));
  if (!managedSection(section) || section === "products")
    return { error: "Archive products by unchecking Available in shop." };
  const context = await requireArea(management[section].area);
  const id = String(form.get("id"));
  if (!z.uuid().safeParse(id).success || form.get("confirm") !== "on")
    return { error: "Confirm this removal." };
  const { error } = await context.db
    .from(management[section].table)
    .delete()
    .eq("id", id);
  if (error) return { error: publicError(error) };
  revalidatePath("/", "layout");
  redirect("/admin/" + section + "?removed=1");
}
export async function saveContentAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  const context = await requireArea("content");
  const key = String(form.get("key"));
  const s = (key: string) => String(form.get(key) || "").trim();
  try {
    let value: Record<string, unknown>;
    if (key === "home-images")
      value = z
        .object({
          learning_image_url: url,
          learning_image_alt: text(0, 240),
          about_image_url: url,
          about_image_alt: text(0, 240),
        })
        .parse({
          learning_image_url: s("learning_image_url") || null,
          learning_image_alt: s("learning_image_alt"),
          about_image_url: s("about_image_url") || null,
          about_image_alt: s("about_image_alt"),
        });
    else if (key === "about")
      value = z
        .object({ title: text(3, 180), body: text(20, 12000), image_url: url })
        .parse({
          title: s("title"),
          body: s("body"),
          image_url: s("image_url") || null,
        });
    else if (key === "contact")
      value = z
        .object({ email: z.email(), phone: text(0, 40), address: text(0, 500) })
        .parse({ email: s("email"), phone: s("phone"), address: s("address") });
    else if (key === "commerce")
      value = z
        .object({
          refund_policy: text(20, 8000),
        })
        .parse({
          refund_policy: s("refund_policy"),
        });
    else if (/^service-[0-5]$/.test(key))
      value = z
        .object({ copy: text(10, 500), image_url: url })
        .parse({ copy: s("copy"), image_url: s("image_url") || null });
    else return { error: "Unknown content section." };
    const { error } = await context.db.from("site_content").upsert({
      key,
      value,
      published: form.get("published") === "on",
      updated_at: new Date().toISOString(),
    });
    if (error) return { error: publicError(error) };
    revalidatePath("/", "layout");
    return { success: "Content saved." };
  } catch (e) {
    return {
      error:
        e instanceof z.ZodError
          ? e.issues[0].message
          : "Check the content and try again.",
    };
  }
}
