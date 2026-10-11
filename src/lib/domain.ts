export const ADMIN_AREAS = [
  "users",
  "jobs",
  "shop",
  "orders",
  "partners",
  "content",
] as const;
export type AdminArea = (typeof ADMIN_AREAS)[number];
export type Approval = "pending" | "approved" | "inactive";
export type Employment = "full-time" | "part-time" | "contract" | "internship";
export const EMPLOYMENT_TYPES: Employment[] = [
  "full-time",
  "part-time",
  "contract",
  "internship",
];
export const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "shortlisted",
  "rejected",
  "hired",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];
export interface Membership {
  user_id: string;
  role: "admin" | "super_admin";
  areas: AdminArea[];
  active: boolean;
}
export interface ListItem {
  id: string;
  name: string;
  active: boolean;
}
export interface Profile {
  user_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  location_id: string | null;
  category_id: string | null;
  experience: string;
  education: string;
  linkedin_url: string;
  preferred_roles: string[];
  employment_preferences: Employment[];
  interests: string[];
  cv_id: string | null;
  terms_accepted_at: string;
  terms_version: string;
  marketing_consent: boolean;
  updated_at: string;
}
export interface CvDocument {
  id: string;
  owner_id: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  status: "pending" | "ready";
  object_key: string;
  staging_key: string;
}
export interface Job {
  id: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  category_id: string | null;
  location_id: string | null;
  employment_type: Employment;
  application_type: "internal" | "external";
  application_url: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  salary_period: string;
  status: "draft" | "published" | "closed";
  closes_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  cv_id: string;
  cover_note: string;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}
export interface GateInput {
  signedIn: boolean;
  verified: boolean;
  approval: Approval | null;
  profile: Profile | null;
  skillCount: number;
  cvReady: boolean;
}
export function profileProgress(
  profile: Profile | null,
  skillCount: number,
  cvReady: boolean,
) {
  const fields = [
    ["Full name", !!profile?.full_name.trim()],
    ["Email", !!profile?.email.trim()],
    ["Phone number", !!profile?.phone?.trim()],
    ["Location", !!profile?.location_id],
    ["Job category", !!profile?.category_id],
    ["Skills", skillCount > 0],
    ["Experience", !!profile?.experience.trim()],
    ["Education", !!profile?.education.trim()],
    ["CV", cvReady],
    ["Professional profile link", !!profile?.linkedin_url.trim()],
    ["Preferred roles", !!profile?.preferred_roles.length],
    ["Employment preferences", !!profile?.employment_preferences.length],
    ["Areas of interest", !!profile?.interests.length],
  ] as const;
  const completed = fields.filter(([, ready]) => ready).length;
  return {
    percent: Math.floor((completed * 100) / fields.length),
    completed,
    total: fields.length,
    missing: fields.filter(([, ready]) => !ready).map(([name]) => name),
  };
}
export function applicationGate(input: GateInput) {
  if (!input.signedIn) return "sign-in";
  if (!input.verified) return "verification";
  if (input.approval === "inactive") return "inactive";
  if (input.approval !== "approved") return "approval";
  if (
    profileProgress(input.profile, input.skillCount, input.cvReady).percent !==
    100
  )
    return "profile";
  return "ready";
}
export function canManage(membership: Membership | null, area: AdminArea) {
  return (
    !!membership?.active &&
    (membership.role === "super_admin" || membership.areas.includes(area))
  );
}
export function normalizePhone(value: string) {
  const compact = value.replace(/[\s()-]/g, "");
  if (/^0[789]\d{9}$/.test(compact)) return "+234" + compact.slice(1);
  if (/^234[789]\d{9}$/.test(compact)) return "+" + compact;
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return compact;
  throw new Error("Enter a valid phone number, including its country code.");
}
export function safeNext(value: unknown, fallback = "/workspace") {
  if (
    typeof value !== "string" ||
    !/^\/(?!\/)/.test(value) ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (!/^\/(?!\/)/.test(decoded) || /[\\\r\n]/.test(decoded)) return fallback;
    return value;
  } catch {
    return fallback;
  }
}
export function salaryLabel(job: Job) {
  if (job.salary_min == null && job.salary_max == null)
    return "Pay disclosed by the employer";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: job.currency,
      maximumFractionDigits: 0,
    }).format(n);
  return (
    (job.salary_min != null ? fmt(job.salary_min) : "") +
    (job.salary_min != null && job.salary_max != null ? "–" : "") +
    (job.salary_max != null ? fmt(job.salary_max) : "")
  );
}
