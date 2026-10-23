import "server-only";
import { publicDb } from "./public-db";
import { supabaseConfigured } from "./env";
import {
  SEARCH_KINDS,
  type SearchFilters,
  type SearchGroup,
  type SearchKind,
} from "./search";
export async function searchCatalog(
  filters: SearchFilters,
  kinds: readonly SearchKind[] = SEARCH_KINDS,
): Promise<SearchGroup[]> {
  if (!supabaseConfigured())
    return kinds.map((kind) => ({ kind, total: 0, page: 0, items: [] }));
  const db = publicDb();
  return Promise.all(
    kinds.map(async (kind) => {
      const fetchPage = (page: number) =>
        db.rpc("search_catalog", {
          p_kind: kind,
          p_query: filters.q,
          p_category: filters.category || null,
          p_location: filters.location || null,
          p_page: page,
        });
      let page = filters.pages[kind];
      let result = await fetchPage(page);
      if (result.error || !result.data)
        throw new Error(
          "Search is temporarily unavailable. Please try again shortly.",
        );
      // A stale page URL should show the last available page rather than a false empty state.
      const last = Math.max(0, Math.ceil(result.data.total / 6) - 1);
      if (page > last) {
        page = last;
        result = await fetchPage(page);
      }
      if (result.error || !result.data)
        throw new Error(
          "Search is temporarily unavailable. Please try again shortly.",
        );
      return {
        kind,
        page,
        total: Number(result.data.total),
        items: result.data.items,
      };
    }),
  );
}
