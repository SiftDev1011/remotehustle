export default function AdminLoading() {
  return (
    <main
      id="rh-main"
      className="rm-page rm-shell app-workspace-main app-loading"
      aria-busy="true"
      aria-label="Loading admin page"
    >
      <div className="app-skeleton" />
      <div className="app-skeleton app-skeleton-title" />
      <div className="app-skeleton" />
      <span className="rh-a11y">Loading your workspace.</span>
    </main>
  );
}
