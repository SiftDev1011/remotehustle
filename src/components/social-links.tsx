import type { SocialLink } from "@/lib/brand-settings";
const paths: Record<string, string> = {
  instagram:
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 5a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm6-2v2",
  facebook: "M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V2h-3c-4 0-5 3-5 5v2H7v4h3v9",
  x: "M3 3l18 18M21 3L3 21M3 3h5l13 18h-5L3 3",
  linkedin: "M4 9v12M4 3v1M10 21V9h4v2c3-4 7-2 7 2v8M14 11v10",
  tiktok: "M14 3v12a5 5 0 1 1-5-5M14 3c0 4 3 6 7 6",
  youtube:
    "M21 7c-1-2-17-2-18 0-1 2-1 8 0 10 1 2 17 2 18 0 1-2 1-8 0-10zM10 9l5 3-5 3V9z",
  whatsapp:
    "M3 21l1-5a9 9 0 1 1 4 4l-5 1zM8 7c0 4 5 9 9 9l1-3-3-1-1 1-3-3 1-1-1-3-3 1",
};
export function SocialLinks({ links }: { links: SocialLink[] }) {
  if (!links.length) return null;
  return (
    <nav className="app-social-links" aria-label="Follow REMOTE HUSTLE">
      {links.map((l) => (
        <a
          key={l.key}
          href={l.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
        >
          <svg
            aria-hidden="true"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={paths[l.key]} />
          </svg>
        </a>
      ))}
    </nav>
  );
}
