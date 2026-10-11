"use client";
import { useState } from "react";
interface Partner {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
}
export function PartnerStrip({ partners }: { partners: Partner[] }) {
  const [touch, setTouch] = useState(false);
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
      data-paused={touch}
      onTouchStart={() => setTouch(true)}
      onTouchEnd={(e) => setTouch(e.touches.length > 0)}
      onTouchCancel={() => setTouch(false)}
    >
      <p className="rh-affiliate-label">Partnering Organisations</p>
      {partners.length ? (
        <div className="rh-affiliate-window">
          <div className="rh-affiliate-track">
            <div className="app-partner-set">
              {partners.map((p) =>
                p.website_url ? (
                  <a
                    key={p.id}
                    className="rh-affiliate-logo"
                    href={p.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {logo(p)}
                  </a>
                ) : (
                  <span key={p.id} className="rh-affiliate-logo">
                    {logo(p)}
                  </span>
                ),
              )}
            </div>
            <div className="app-partner-set" aria-hidden="true">
              {partners.map((p) => (
                <span key={p.id} className="rh-affiliate-logo">
                  {logo(p)}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="rm-note">
          Partnering organisations will appear here when announced.
        </p>
      )}
    </section>
  );
}
