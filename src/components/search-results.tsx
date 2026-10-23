import Link from "next/link";
import { Disclosure } from "./disclosure";
import { JobCard } from "./job-card";
import { ProductCard } from "./product-card";
import { EmptyState, Badge } from "./ui";
import type { Job, ListItem } from "@/lib/domain";
import type { Product } from "@/lib/commerce";
import {
  SEARCH_LABELS,
  searchHref,
  type SearchFilters,
  type SearchGroup,
  type Program,
} from "@/lib/search";
export function SearchResults({
  groups,
  filters,
  locations = [],
}: {
  groups: SearchGroup[];
  filters: SearchFilters;
  locations?: ListItem[];
}) {
  return (
    <div className="app-search-results">
      {groups.map((group) => (
        <section
          className="app-search-group"
          id={group.kind}
          key={group.kind}
          aria-labelledby={group.kind + "-heading"}
        >
          <div className="app-search-group-head">
            <h2 id={group.kind + "-heading"}>{SEARCH_LABELS[group.kind]}</h2>
            <span className="rm-note">
              {group.total} result{group.total === 1 ? "" : "s"}
            </span>
          </div>
          {!group.total ? (
            <EmptyState
              title={
                "No matching " +
                SEARCH_LABELS[group.kind].toLowerCase() +
                " yet."
              }
            />
          ) : (
            <>
              <div
                className={
                  group.kind === "resources"
                    ? "app-product-grid app-products-compact"
                    : group.kind === "jobs"
                      ? "rh-jobs-list"
                      : "app-search-programs"
                }
              >
                {group.items.map((item) =>
                  group.kind === "jobs" ? (
                    <JobCard
                      key={item.id}
                      job={item as Job}
                      location={
                        locations.find(
                          (l) => l.id === (item as Job).location_id,
                        )?.name
                      }
                    />
                  ) : group.kind === "resources" ? (
                    <ProductCard key={item.id} product={item as Product} />
                  ) : (
                    <ProgramResult key={item.id} program={item as Program} />
                  ),
                )}
              </div>
              {group.total > 6 && (
                <nav
                  className="app-search-pagination"
                  aria-label={SEARCH_LABELS[group.kind] + " pages"}
                >
                  {group.page > 0 && (
                    <Link
                      className="rm-btn rm-btn-secondary"
                      href={searchHref(filters, group.kind, group.page - 1)}
                    >
                      Previous
                    </Link>
                  )}
                  <span>
                    Page {group.page + 1} of {Math.ceil(group.total / 6)}
                  </span>
                  {(group.page + 1) * 6 < group.total && (
                    <Link
                      className="rm-btn rm-btn-secondary"
                      href={searchHref(filters, group.kind, group.page + 1)}
                    >
                      Next
                    </Link>
                  )}
                </nav>
              )}
            </>
          )}
        </section>
      ))}
    </div>
  );
}
function ProgramResult({ program: p }: { program: Program }) {
  return (
    <article className="app-card app-search-program">
      {p.image_url && (
        <img
          className="app-program-image"
          src={p.image_url}
          alt=""
          width={600}
          height={320}
          loading="lazy"
        />
      )}
      <Badge>{p.type}</Badge>
      <h3>{p.title}</h3>
      {p.duration && <p className="rm-note">{p.duration}</p>}
      <p className="rm-note app-preline">
        {p.description.length > 220
          ? p.description.slice(0, 220) + "…"
          : p.description}
      </p>
      {p.description.length > 220 && (
        <Disclosure label="Read full description">
          <p className="rm-note app-preline">{p.description}</p>
        </Disclosure>
      )}
      {p.link && (
        <a
          className="rm-text-link"
          href={p.link}
          target="_blank"
          rel="noopener noreferrer"
        >
          Programme information
        </a>
      )}
    </article>
  );
}
