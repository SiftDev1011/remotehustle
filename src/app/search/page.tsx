import Link from "next/link";
import { Dropdown } from "@/components/dropdown";
import { Breadcrumbs } from "@/components/ui";
import { SearchResults } from "@/components/search-results";
import { lists } from "@/lib/queries";
import { searchCatalog } from "@/lib/catalog-search";
import { SEARCH_LABELS, searchFilters } from "@/lib/search";
export const metadata = {
  title: "Search | REMOTE HUSTLE",
  robots: { index: false, follow: true },
};
export default async function Search({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = searchFilters(await searchParams);
  const [groups, taxonomy] = await Promise.all([
    searchCatalog(filters),
    lists(),
  ]);
  const total = groups.reduce((sum, g) => sum + g.total, 0);
  return (
    <main id="rh-main" className="rm-page rm-shell app-search-page">
      <Breadcrumbs items={[{ label: "Search" }]} />
      <h1 className="app-visually-hidden">Search REMOTE HUSTLE</h1>
      <form action="/search" className="app-catalog-search">
        <div className="rm-search-input">
          <input
            name="q"
            aria-label="Search jobs, training, internships and resources"
            placeholder="Role, category, skill or keyword"
            defaultValue={filters.q}
            maxLength={150}
          />
        </div>
        <Dropdown
          name="category"
          aria-label="Career category"
          defaultValue={filters.category}
        >
          <option value="">All career categories</option>
          {taxonomy.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Dropdown>
        <Dropdown
          name="location"
          aria-label="Job location"
          defaultValue={filters.location}
        >
          <option value="">All job locations</option>
          {taxonomy.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Dropdown>
        <button className="rm-btn" type="submit">
          Search
        </button>
      </form>
      <p className="rm-note">
        {total} result{total === 1 ? "" : "s"}
        {filters.q ? ` for “${filters.q}”` : ""}. Location filters apply to
        jobs; related learning and resources are included from all locations.
      </p>
      <nav className="app-search-jumps" aria-label="Search result types">
        {groups.map((g) => (
          <a key={g.kind} href={"#" + g.kind}>
            {SEARCH_LABELS[g.kind]} <span>{g.total}</span>
          </a>
        ))}
        {(filters.q || filters.category || filters.location) && (
          <Link href="/search">Clear filters</Link>
        )}
      </nav>
      <SearchResults
        groups={groups}
        filters={filters}
        locations={taxonomy.locations}
      />
    </main>
  );
}
