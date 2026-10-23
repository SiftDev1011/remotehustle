import Link from "next/link";
export function Brand({ logoUrl = "" }: { logoUrl?: string }) {
  return (
    <Link
      className="rh-logo app-brand"
      href="/"
      aria-label="REMOTE HUSTLE home"
    >
      {logoUrl ? (
        <img src={logoUrl} alt="REMOTE HUSTLE" width={180} height={60} />
      ) : (
        <span>
          REMOTE
          <br />
          HUSTLE
        </span>
      )}
    </Link>
  );
}
