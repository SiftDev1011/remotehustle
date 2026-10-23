import { z } from "zod";
import { phoneSchema } from "./validation";
export const AGREEMENT_VERSION = "rh-1.0-2026-10-22";
export const GENDERS = [
  "Female",
  "Male",
  "Non-binary",
  "Other",
  "Prefer not to say",
] as const;
export const SKILL_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;
export const PLATFORMS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "X",
  "LinkedIn",
] as const;
export const REFERRALS = [
  "Social media",
  "Friend or family",
  "School or community",
  "Event or training",
  "Search engine",
  "Other",
] as const;
const codes =
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(
    " ",
  );
const names = new Intl.DisplayNames(["en"], { type: "region" });
export const COUNTRIES = codes
  .map((code) => ({ code, name: names.of(code) || code }))
  .sort((a, b) => a.name.localeCompare(b.name));
const text = (min: number, max: number) => z.string().trim().min(min).max(max);
export const registrationSchema = z.object({
  full_name: text(2, 120),
  date_of_birth: z.iso
    .date()
    .refine(
      (v) => v >= "1900-01-01" && v <= new Date().toISOString().slice(0, 10),
      "Enter a valid date of birth.",
    ),
  phone: phoneSchema,
  whatsapp_active: z.literal(
    true,
    "Confirm that this number is active on WhatsApp.",
  ),
  gender: z.enum(GENDERS),
  country: z.string().refine((v) => codes.includes(v), "Select a country."),
  state: text(2, 120),
  address: text(5, 500),
  primary_platform: z.enum(PLATFORMS),
  social_handles: text(1, 500),
  category_id: z.uuid("Select a category."),
  skill_level: z.enum(SKILL_LEVELS),
  professional_platforms: text(0, 1000),
  performance_agreement: z.literal(true, "Accept the participation agreement."),
  community_agreement: z.literal(true, "Accept the community agreement."),
  privacy_acknowledged: z.literal(true, "Acknowledge the privacy notice."),
  heard_from: z.enum(REFERRALS),
  access_code: text(12, 80),
});
export type RegistrationData = Omit<
  z.infer<typeof registrationSchema>,
  "category_id" | "access_code"
>;
export type RegistrationRecord = {
  id: string;
  user_id: string;
  email: string;
  category_id: string;
  data: RegistrationData;
  status: "submitted" | "reviewed";
  created_at: string;
  agreement_version: string;
};
export const REGISTRATION_LABELS: Record<keyof RegistrationData, string> = {
  full_name: "Full name (certificate)",
  date_of_birth: "Date of birth",
  phone: "Phone",
  whatsapp_active: "WhatsApp active",
  gender: "Gender",
  country: "Country",
  state: "State of residence",
  address: "Address",
  primary_platform: "Primary social media platform",
  social_handles: "Social media handles",
  skill_level: "Skill level",
  professional_platforms: "Professional platforms",
  performance_agreement: "Participation agreement",
  community_agreement: "Community agreement",
  privacy_acknowledged: "Privacy notice acknowledged",
  heard_from: "How you heard about us",
};
