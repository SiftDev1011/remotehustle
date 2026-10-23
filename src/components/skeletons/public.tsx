import {
  Bone,
  ButtonBone,
  CrumbBone,
  ChoiceBones,
  FieldBone,
  FormBone,
  HeadingBone,
  Lines,
  LoadingPage,
  PhoneBone,
} from "./primitives";

function JobOverviewBone() {
  return (
    <div className="app-job-overview rh-skeleton-stack">
      <Bone width="86%" height={34} />
      <Bone width={160} height={20} />
      <Bone width="55%" />
      <Bone width="72%" />
    </div>
  );
}
function JobDescriptionBone() {
  return (
    <div className="app-job-description">
      <section>
        <Bone width={140} height={22} />
        <dl>
          {[0, 1, 2].map((i) => (
            <div key={i}>
              <Bone width={65} />
              <Bone width="65%" height={18} />
            </div>
          ))}
        </dl>
      </section>
      <section>
        <Bone width={220} height={22} />
        <Lines count={7} />
      </section>
      <section>
        <Bone width={160} height={22} />
        <Lines count={4} />
      </section>
    </div>
  );
}
export function JobsSkeleton() {
  return (
    <LoadingPage className="rm-page rm-shell app-jobs-page" label="jobs">
      <CrumbBone />
      <div className="app-job-search">
        <div className="rm-search-input">
          <Bone height={40} />
        </div>
        {[0, 1, 2].map((i) => (
          <div className="app-dropdown" key={i}>
            <Bone height={47} />
          </div>
        ))}
        <div className="rm-btn rh-skeleton-control">
          <ButtonBone width={100} />
        </div>
      </div>
      <p className="rm-note">
        <Bone width={125} />
      </p>
      <div className="app-job-browser">
        <div className="app-job-list">
          {[0, 1, 2].map((i) => (
            <div className="app-job-result rh-skeleton-stack" key={i}>
              <Bone width={75} height={12} />
              <Bone width="86%" height={25} />
              <Bone width={145} height={19} />
              <Bone width="65%" />
              <div className="app-job-tags">
                <Bone width={160} height={29} />
                <Bone width={80} height={29} />
              </div>
              <Lines count={2} />
              <Bone width={65} height={12} />
            </div>
          ))}
        </div>
        <div className="app-job-preview">
          <div className="app-job-preview-heading">
            <JobOverviewBone />
            <div className="rm-actions">
              <ButtonBone />
              <Bone width={110} />
            </div>
          </div>
          <JobDescriptionBone />
        </div>
      </div>
    </LoadingPage>
  );
}
export function JobDetailSkeleton() {
  return (
    <LoadingPage
      className="rm-page rm-shell rm-narrow app-job-detail"
      label="job details"
    >
      <CrumbBone />
      <div className="app-job-detail-heading">
        <JobOverviewBone />
        <ButtonBone />
      </div>
      <JobDescriptionBone />
      <div className="app-card">
        <FormBone fields={0} textarea />
      </div>
    </LoadingPage>
  );
}

export function ProductBones({ count = 4 }: { count?: number }) {
  return (
    <div className="app-product-grid app-products-compact">
      {Array.from({ length: count }, (_, i) => (
        <div className="app-product-card" key={i}>
          <div className="app-product-image rh-skeleton-surface" />
          <div className="app-product-copy">
            <Bone width={100} height={12} />
            <h3>
              <Bone width="80%" height={22} />
            </h3>
            <div className="rh-skeleton-copy-lines">
              <Lines count={2} />
            </div>
            <Bone width={85} height={20} />
          </div>
        </div>
      ))}
    </div>
  );
}
export function ShopSkeleton() {
  return (
    <LoadingPage className="rm-page rm-shell app-shop-page" label="shop">
      <CrumbBone />
      <div className="app-shop-toolbar">
        <div className="app-filter-bar">
          <FieldBone />
          <FieldBone />
          <ButtonBone width={95} />
        </div>
        <div className="app-shop-actions">
          <ButtonBone width={120} />
          <ButtonBone width={130} />
        </div>
      </div>
      <ProductBones count={8} />
    </LoadingPage>
  );
}
export function ProductSkeleton({ buy = false }: { buy?: boolean }) {
  const image = <div className="app-product-image rh-skeleton-surface" />;
  const copy = (
    <div className="rh-skeleton-stack">
      <Bone width={130} height={28} />
      <Bone width="90%" height={48} />
      <Lines count={4} />
      <Bone width={120} height={29} />
      <ButtonBone />
      <Lines count={2} />
    </div>
  );
  return (
    <LoadingPage
      className={`rm-page rm-shell${buy ? " rm-narrow" : ""}`}
      label="resource details"
    >
      <CrumbBone />
      {buy ? (
        <div className="app-card rh-skeleton-stack">
          <Bone width={130} height={28} />
          <Bone width="90%" height={48} />
          {image}
          <Lines count={4} />
          <Bone width={120} height={29} />
          <ButtonBone />
          <Lines count={2} />
        </div>
      ) : (
        <div className="app-product-detail">
          {image}
          {copy}
        </div>
      )}
    </LoadingPage>
  );
}

export function HomeSkeleton() {
  return (
    <LoadingPage className="" label="homepage">
      <section className="rh-hero-gallery">
        <div className="rh-image-accordion">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              className={`rh-service rh-skeleton-service ${i === 0 ? "is-active" : ""}`}
              key={i}
            >
              <div className="rh-service-label">
                <Bone width={i === 0 ? 150 : 14} height={i === 0 ? 14 : 140} />
              </div>
              {i === 0 && (
                <div className="rh-service-body">
                  <div className="rh-skeleton-hero-title">
                    <Bone height="1em" />
                    <Bone width="78%" height="1em" />
                    <Bone width="90%" height="1em" />
                  </div>
                  <div className="rh-skeleton-description">
                    <Lines count={3} />
                  </div>
                  <ButtonBone width={185} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="rh-hero-footer">
          <Bone width={170} />
          <div className="rh-hero-navigation">
            <Bone width={42} height={42} className="rh-skeleton-round" />
            <Bone width={42} height={42} className="rh-skeleton-round" />
          </div>
        </div>
      </section>
      <section className="rh-search-section rh-shell">
        <div className="rh-hero-search">
          <div className="rh-search-field">
            <FieldBone />
          </div>
          <div className="rh-search-field">
            <FieldBone />
          </div>
          <ButtonBone width={185} />
        </div>
      </section>
      <section className="rh-discover rh-shell">
        <div className="rh-section-head">
          <Bone width="min(70%, 420px)" height={42} />
          <Bone width={60} />
        </div>
        <div className="rh-list">
          {[0, 1, 2].map((i) => (
            <div className="rh-job" key={i}>
              <div className="rh-job-logo rh-skeleton-surface" />
              <div className="rh-job-info">
                <Bone width="85%" height={25} />
                <Lines count={2} />
              </div>
              <div className="rh-job-pay">
                <Bone width={120} height={22} />
                <Lines count={1} />
              </div>
              <Bone width={115} className="app-job-link" />
            </div>
          ))}
        </div>
      </section>
      <section className="rh-learning rh-shell">
        <div>
          <HeadingBone spacious />
          <Lines />{" "}
          <div className="rh-courses">
            {[0, 1, 2].map((i) => (
              <div className="rh-course" key={i}>
                <div className="rh-skeleton-heading">
                  <Bone width="80%" height={20} />
                  <Lines count={1} />
                </div>
              </div>
            ))}
          </div>
          <ButtonBone />
        </div>
        <div className="rh-learning-photo rh-skeleton-surface" />
      </section>
      <section className="rh-about rh-shell">
        <div className="rh-about-copy">
          <HeadingBone spacious />
          <Lines count={5} />
          <div className="rm-actions">
            <ButtonBone />
          </div>
        </div>
        <div className="rh-about-photo rh-skeleton-surface" />
      </section>
      <section className="rh-shell app-home-shop">
        <div className="rh-section-head">
          <Bone width="min(70%, 330px)" height={42} />
          <Bone width={110} />
        </div>
        <ProductBones count={3} />
      </section>
    </LoadingPage>
  );
}

export function ProgramsSkeleton() {
  return (
    <LoadingPage className="rm-page rm-shell rm-narrow" label="programmes">
      <CrumbBone />
      <HeadingBone spacious />
      <ButtonBone width={240} />
      <div className="app-record-list">
        {[0, 1, 2].map((i) => (
          <div className="app-card rh-skeleton-stack" key={i}>
            <div className="app-program-image rh-skeleton-surface" />
            <Bone width={85} height={28} />
            <Bone width="75%" height={28} />
            <Bone width={150} />
            <Lines count={3} />
            <Bone width={170} />
          </div>
        ))}
      </div>
    </LoadingPage>
  );
}
export function AboutSkeleton() {
  return (
    <LoadingPage className="rm-page rm-shell rm-narrow" label="about page">
      <CrumbBone />
      <HeadingBone description={false} />
      <div className="rh-about-photo rh-skeleton-surface" />
      <div className="app-prose app-section">
        <HeadingBone />
        <Lines count={6} />
      </div>
      <ButtonBone />
      <div className="app-card app-section">
        <HeadingBone />
        <FormBone fields={3} textarea />
      </div>
    </LoadingPage>
  );
}
export function AuthSkeleton({
  fields = 2,
  description = false,
  signup = false,
}: {
  fields?: number;
  description?: boolean;
  signup?: boolean;
}) {
  return (
    <LoadingPage className="rm-page rm-shell app-auth" label="account form">
      <CrumbBone />
      <HeadingBone description={description} />
      {signup ? (
        <div className="app-form">
          <div className="app-form-fields">
            <FieldBone />
            <FieldBone />
            <PhoneBone />
            <FieldBone />
            <Lines count={2} />
            <ChoiceBones />
            <ButtonBone />
          </div>
        </div>
      ) : (
        <FormBone fields={fields} />
      )}
      <Lines count={2} />
    </LoadingPage>
  );
}
export function RegistrationSkeleton() {
  return (
    <LoadingPage
      className="rm-page rm-shell app-registration"
      label="programme registration"
    >
      <CrumbBone />
      <HeadingBone eyebrow />
      <div className="app-form">
        <div className="app-form-fields">
          <Bone width={150} height={26} />
          <div className="app-registration-grid">
            <FieldBone />
            <FieldBone />
            <FieldBone />
            <PhoneBone />
            <FieldBone />
            <FieldBone />
            <FieldBone />
            <FieldBone tall />
          </div>
          <ChoiceBones count={1} />
          <Bone width={190} height={26} />
          <div className="app-registration-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <FieldBone key={i} />
            ))}
          </div>
          <ChoiceBones count={3} />
          <FieldBone />
          <ButtonBone />
        </div>
      </div>
    </LoadingPage>
  );
}
export function PolicySkeleton() {
  return (
    <LoadingPage className="rm-page rm-shell rm-narrow" label="policy">
      <CrumbBone />
      <HeadingBone />
      <div className="app-prose">
        {[0, 1, 2, 3].map((i) => (
          <section className="app-section" key={i}>
            <Bone width="55%" height={26} />
            <Lines count={5} />
          </section>
        ))}
      </div>
    </LoadingPage>
  );
}
