export default function Loading() {
  return (
    <main
      id="rh-main"
      className="rm-shell app-loading"
      aria-label="Loading page"
      aria-busy="true"
    >
      <div className="app-skeleton app-skeleton-title" />
      <div className="app-skeleton" />
      <div className="app-skeleton" />
      <span className="rh-a11y">Loading your next step.</span>
    </main>
  );
}
