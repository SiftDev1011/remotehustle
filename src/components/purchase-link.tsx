"use client";
import { useState } from "react";
export function PurchaseLink({ url }: { url: string }) {
  const [message, setMessage] = useState("");
  return (
    <div className="app-card app-section">
      <h3>Shareable purchase link</h3>
      <p className="rm-note">
        Customers review this product, then complete the normal account and
        payment steps. Prices and availability are checked again at checkout.
      </p>
      <p className="app-contact-message">
        <a href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>
      </p>
      <button
        type="button"
        className="rm-btn rm-btn-secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setMessage("Purchase link copied.");
          } catch {
            setMessage("Select the link above and copy it.");
          }
        }}
      >
        Copy purchase link
      </button>
      <p role="status" className="rm-note">
        {message}
      </p>
    </div>
  );
}
