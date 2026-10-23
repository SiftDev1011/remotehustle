import { idSchema } from "./validation";
import type { Job } from "./domain";
import type { Product } from "./commerce";
export const SEARCH_KINDS = [
  "jobs",
  "training",
  "internship",
  "resources",
] as const;
export type SearchKind = (typeof SEARCH_KINDS)[number];
export const SEARCH_LABELS: Record<SearchKind, string> = {
  jobs: "Jobs",
  training: "Training",
  internship: "Internships",
  resources: "Resources",
};
export type SearchFilters = {
  q: string;
  category: string;
  location: string;
  pages: Record<SearchKind, number>;
};
export type Program = {
  id: string;
  title: string;
  description: string;
  type: "training" | "internship";
  image_url: string | null;
  link: string | null;
  duration: string;
  starts_on: string | null;
};
export type SearchGroup = {
  kind: SearchKind;
  total: number;
  page: number;
  items: (Job | Program | Product)[];
};
export function searchFilters(
  params: Record<string, string | string[] | undefined>,
): SearchFilters {
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const id = (key: string) =>
    idSchema.safeParse(value(key)).success ? value(key) : "";
  const pages = Object.fromEntries(
    SEARCH_KINDS.map((kind) => [
      kind,
      Math.max(
        0,
        Math.min(10000, Math.floor(Number(value(kind + "Page")) || 0)),
      ),
    ]),
  ) as Record<SearchKind, number>;
  return {
    q: value("q").trim().slice(0, 150),
    category: id("category"),
    location: id("location"),
    pages,
  };
}
export function searchHref(
  filters: SearchFilters,
  kind?: SearchKind,
  page?: number,
) {
  const params = new URLSearchParams();
  for (const key of ["q", "category", "location"] as const)
    if (filters[key]) params.set(key, filters[key]);
  for (const k of SEARCH_KINDS) {
    const n = k === kind && page !== undefined ? page : filters.pages[k];
    if (n) params.set(k + "Page", String(n));
  }
  return (
    "/search" +
    (params.size ? "?" + params.toString() : "") +
    (kind ? "#" + kind : "")
  );
}
