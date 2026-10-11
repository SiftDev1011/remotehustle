import { z } from "zod";
export const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(4000),
  consent: z.literal(true),
  website: z.string().max(200).default(""),
  captcha_token: z.string().max(2048).default(""),
});
