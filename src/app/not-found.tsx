import Link from "next/link";
export default function NotFound() {
  return (
    <main id="rh-main" className="rm-page rm-shell rm-narrow">
      <span className="rm-eyebrow">404</span>
      <h1>This page took another route.</h1>
      <p className="rm-note">
        The page may have moved or the link may be incorrect.
      </p>
      <Link href="/" className="rm-btn">
        Back to Remote Hustle ↗
      </Link>
    </main>
  );
}
