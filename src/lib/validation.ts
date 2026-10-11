import { z } from "zod";
import {
  ADMIN_AREAS,
  EMPLOYMENT_TYPES,
  APPLICATION_STATUSES,
  normalizePhone,
} from "./domain";

export const idSchema = z.string().uuid("Invalid record identifier.");
export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.")
  .max(254)
  .transform((s) => s.toLowerCase());
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128);
export const phoneSchema = z
  .string()
  .trim()
  .max(40)
  .transform((s, ctx) => {
    try {
      return normalizePhone(s);
    } catch {
      ctx.addIssue({ code: "custom", message: "Enter a valid phone number." });
      return z.NEVER;
    }
  });
export const httpsSchema = z
  .string()
  .trim()
  .url("Enter a full HTTPS link.")
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use an HTTPS link without a username or password.");
export const signupSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
  consent: z.literal(true, "Accept the terms and privacy notice to continue."),
  marketing_consent: z.boolean().default(false),
});
const list = z.array(z.string().trim().min(1).max(100)).max(20);
export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: phoneSchema,
  location_id: idSchema.nullable(),
  category_id: idSchema.nullable(),
  experience: z.string().trim().max(5000),
  education: z.string().trim().max(3000),
  linkedin_url: z.union([httpsSchema, z.literal("")]),
  preferred_roles: list,
  employment_preferences: z.array(z.enum(EMPLOYMENT_TYPES)).max(4),
  interests: list,
  skill_ids: z.array(idSchema).max(30),
  marketing_consent: z.boolean(),
});
export const jobSchema = z
  .object({
    title: z.string().trim().min(3).max(180),
    company: z.string().trim().min(2).max(180),
    description: z.string().trim().min(20).max(15000),
    requirements: z.string().trim().min(5).max(10000),
    category_id: idSchema.nullable(),
    location_id: idSchema.nullable(),
    employment_type: z.enum(EMPLOYMENT_TYPES),
    application_type: z.enum(["internal", "external"]),
    application_url: z.union([httpsSchema, z.literal(""), z.null()]),
    salary_min: z.number().nonnegative().max(1e12).nullable(),
    salary_max: z.number().nonnegative().max(1e12).nullable(),
    currency: z.string().regex(/^[A-Z]{3}$/),
    salary_period: z.enum(["month", "year", "hour", "project"]),
    status: z.enum(["draft", "published", "closed"]),
    closes_at: z.string().datetime().nullable(),
  })
  .refine((x) => x.application_type === "internal" || !!x.application_url, {
    message: "External applications need a company website link.",
    path: ["application_url"],
  })
  .refine(
    (x) =>
      x.salary_min == null ||
      x.salary_max == null ||
      x.salary_max >= x.salary_min,
    {
      message: "Maximum pay must be at least the minimum.",
      path: ["salary_max"],
    },
  );
export const applicationSchema = z.object({
  job_id: idSchema,
  cover_note: z.string().trim().max(3000),
});
export const applicationStatusSchema = z.enum(APPLICATION_STATUSES);
export const adminInviteSchema = z.object({
  email: emailSchema,
  full_name: z.string().trim().min(2).max(120),
  areas: z
    .array(z.enum(ADMIN_AREAS))
    .min(1, "Choose at least one access area.")
    .max(6),
});
export function validationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Check the information entered.";
}
export function splitList(value: FormDataEntryValue | null) {
  return [
    ...new Set(
      String(value || "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ];
}
