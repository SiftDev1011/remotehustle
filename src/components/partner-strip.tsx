"use client";
import { AutoScrollStrip } from "./auto-scroll-strip";
interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}
export function PartnerStrip({ partners }: { partners: Partner[] }) {
  const logo = (p: Partner) => (
    <>
      {p.logo_url && (
        <img src={p.logo_url} alt="" width={70} height={40} loading="lazy" />
      )}
      <span>{p.name}</span>
    </>
  );
  return (
    <section
      className="rh-affiliates rh-shell"
      aria-label="Partnering Organisations"
    >
      <p className="rh-affiliate-label">Partnering Organisations</p>
      {partners.length ? (
        <AutoScrollStrip
          count={partners.length}
          label="Browse partnering organisations"
          className="rh-affiliate-viewport"
          trackClass="rh-affiliate-track"
          groupClass="app-partner-set"
          renderItems={(duplicate) =>
            partners.map((p) =>
              p.website_url ? (
                <a
                  key={p.id}
                  className="rh-affiliate-logo"
                  href={p.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={duplicate ? -1 : undefined}
                >
                  {logo(p)}
                </a>
              ) : (
                <span key={p.id} className="rh-affiliate-logo">
                  {logo(p)}
                </span>
              ),
            )
          }
        />
      ) : (
        <p className="rm-note">
          Partnering organisations will appear here when announced.
        </p>
      )}
    </section>
  );
}
