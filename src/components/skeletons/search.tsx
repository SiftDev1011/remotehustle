import { LoadingPage, CrumbBone, Bone, Lines, ButtonBone } from "./primitives";
import { ProductBones } from "./public";
export function SearchSkeleton() {
  return (
    <LoadingPage
      label="search results"
      className="rm-page rm-shell app-search-page"
    >
      <CrumbBone />
      <div className="app-catalog-search">
        <Bone height={48} />
        <Bone height={48} />
        <Bone height={48} />
        <ButtonBone />
      </div>
      <Bone width="65%" />
      <div className="app-search-jumps">
        {[1, 2, 3, 4].map((i) => (
          <ButtonBone key={i} width={110} />
        ))}
      </div>
      <div className="app-search-results">
        {["jobs", "training", "internships", "resources"].map((kind) => (
          <section className="app-search-group" key={kind}>
            <div className="app-search-group-head">
              <Bone width={180} height={28} />
              <Bone width={70} />
            </div>
            {kind === "resources" ? (
              <ProductBones count={3} />
            ) : (
              <div
                className={
                  kind === "jobs" ? "rh-jobs-list" : "app-search-programs"
                }
              >
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={kind === "jobs" ? "rh-job" : "app-card"}
                  >
                    <Bone width="60%" height={24} />
                    <Lines count={3} />
                    <ButtonBone />
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </LoadingPage>
  );
}
