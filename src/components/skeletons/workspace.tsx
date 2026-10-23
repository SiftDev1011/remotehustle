import {
  Bone,
  ButtonBone,
  CrumbBone,
  ChoiceBones,
  FieldBone,
  FilterBones,
  FormBone,
  HeadingBone,
  Lines,
  LoadingPage,
  RecordBones,
} from "./primitives";

function ProgressBone() {
  return (
    <div className="app-progress rh-skeleton-stack">
      <div className="app-card-header">
        <Bone width={170} height={20} />
        <Bone width={50} />
      </div>
      <Bone height={7} />
      <Bone width={155} />
    </div>
  );
}
export function WorkspaceSkeleton() {
  return (
    <LoadingPage
      className="rm-page rm-shell app-workspace-main"
      label="workspace"
    >
      <CrumbBone />
      <HeadingBone eyebrow />
      <ProgressBone />
      <div className="rm-actions">
        <ButtonBone />
        <ButtonBone />
      </div>
      <section className="app-section">
        <Bone width={240} height={28} />
        <RecordBones compact />
      </section>
    </LoadingPage>
  );
}
export function ProfileSkeleton({ admin = false }: { admin?: boolean }) {
  return (
    <LoadingPage
      className="rm-page rm-shell app-workspace-main"
      label="profile"
    >
      <CrumbBone />
      <HeadingBone />
      {!admin && <ProgressBone />}
      <div className="app-form">
        <div className="app-form-fields">
          <div className="app-form-grid">
            {[0, 1, 2, 3].map((i) => (
              <FieldBone key={i} />
            ))}
          </div>
          <div className="app-choice-group">
            <Bone width={130} />
            <ChoiceBones count={4} />
          </div>
          <FieldBone tall />
          <FieldBone tall />
          <FieldBone />
          <FieldBone />
          <div className="app-choice-group">
            <Bone width={150} />
            <ChoiceBones count={4} />
          </div>
          <FieldBone />
          <ChoiceBones count={1} />
          <ButtonBone />
        </div>
      </div>
      <div className="app-card">
        <Bone width={120} height={24} />
        <FormBone fields={1} />
      </div>
    </LoadingPage>
  );
}
export function JobFormSkeleton() {
  return (
    <LoadingPage
      className="rm-page rm-shell app-workspace-main"
      label="job form"
    >
      <CrumbBone />
      <HeadingBone description={false} />
      <div className="app-form">
        <div className="app-form-fields">
          <div className="app-form-grid">
            <FieldBone />
            <FieldBone />
          </div>
          <FieldBone tall />
          <FieldBone tall />
          <div className="app-form-grid">
            {[0, 1, 2, 3].map((i) => (
              <FieldBone key={i} />
            ))}
          </div>
          <FieldBone />
          <div className="app-form-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <FieldBone key={i} />
            ))}
          </div>
          <ButtonBone />
        </div>
      </div>
    </LoadingPage>
  );
}

export function ManagedFormSkeleton({ section }: { section: string }) {
  const fields =
    section === "product-categories"
      ? 1
      : section === "discounts"
        ? 6
        : section === "programs"
          ? 5
          : 3;
  return (
    <LoadingPage
      className="rm-page rm-shell app-workspace-main"
      label="edit form"
    >
      <CrumbBone />
      <HeadingBone description={false} />
      <div className="app-card">
        <Bone width={180} height={26} />
        <div className="app-form">
          <div className="app-form-fields">
            {["products", "programs"].includes(section) && <FieldBone />}
            <FieldBone tall={section === "testimonials"} />
            {["products", "programs", "impact"].includes(section) && (
              <FieldBone tall />
            )}
            {Array.from({ length: fields - 1 }, (_, i) => (
              <FieldBone key={i} />
            ))}
            {["products", "programs", "partners"].includes(section) && (
              <div className="app-card">
                <Bone width={140} />
                <FormBone fields={1} />
              </div>
            )}
            <ChoiceBones count={section === "testimonials" ? 2 : 1} />
            <ButtonBone />
          </div>
        </div>
        <Bone width={90} />
      </div>
    </LoadingPage>
  );
}
export function ApplicationSkeleton() {
  return (
    <LoadingPage
      className="rm-page rm-shell app-workspace-main"
      label="applications"
    >
      <CrumbBone />
      <HeadingBone />
      <RecordBones actions />
    </LoadingPage>
  );
}
export function OrdersSkeleton() {
  return (
    <LoadingPage className="rm-page rm-shell app-workspace-main" label="orders">
      <CrumbBone />
      <HeadingBone description={false} />
      <RecordBones compact />
    </LoadingPage>
  );
}
export function CheckoutSkeleton({ cart = false }: { cart?: boolean }) {
  return (
    <LoadingPage
      className={`rm-page rm-shell${cart ? "" : " app-workspace-main"}`}
      label={cart ? "cart" : "order"}
    >
      <CrumbBone />
      <HeadingBone description={cart} />
      {!cart && <Bone width={90} height={30} />}
      <div className="app-checkout-grid">
        <div className="app-record-list">
          {[0, 1].map((i) => (
            <div key={i} className={`app-card${cart ? " app-cart-row" : ""}`}>
              {cart && (
                <Bone
                  width={90}
                  height={90}
                  className="rh-skeleton-thumbnail"
                />
              )}
              <div className="rh-skeleton-record-copy rh-skeleton-stack">
                <Bone width="80%" height={24} />
                <Lines count={2} />
                <ButtonBone width={110} />
              </div>
            </div>
          ))}
        </div>
        <div className="app-card app-order-summary">
          <Bone width={190} height={27} />
          <dl>
            {[0, 1, 2].map((i) => (
              <div key={i} className={i === 2 ? "app-total" : ""}>
                <Bone width={100} height={18} />
                <Bone width={75} height={18} />
              </div>
            ))}
          </dl>
          <Lines count={2} />
          {cart && <FormBone fields={1} />}
        </div>
      </div>
      <div className="app-card">
        <Bone width="60%" height={23} />
        <Lines count={2} />
      </div>
    </LoadingPage>
  );
}

export type AdminSkeletonKind =
  | "overview"
  | "stats"
  | "users"
  | "records"
  | "content"
  | "form"
  | "lists"
  | "administrators"
  | "registrations";
export function AdminSkeleton({
  kind = "records",
  filters = 0,
  description = true,
  actions = false,
}: {
  kind?: AdminSkeletonKind;
  filters?: number;
  description?: boolean;
  actions?: boolean;
}) {
  return (
    <LoadingPage
      className="rm-page rm-shell app-workspace-main"
      label="admin page"
    >
      <CrumbBone />
      <HeadingBone description={description} />
      {actions && (
        <div className="app-inline-links">
          <ButtonBone />
          <ButtonBone />
        </div>
      )}
      {filters > 0 && (
        <FilterBones count={filters} searchbar={kind === "users"} />
      )}
      {kind === "overview" && (
        <div className="app-admin-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="app-card rh-skeleton-stack" key={i}>
              <Bone width={85} height={12} />
              <Bone width="85%" height={26} />
            </div>
          ))}
        </div>
      )}
      {kind === "stats" && (
        <>
          <div className="app-stats-grid">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div className="app-card rh-skeleton-stack" key={i}>
                <Bone width="80%" />
                <Bone width={95} height={40} />
              </div>
            ))}
          </div>
          <RecordBones count={2} />
        </>
      )}
      {kind === "users" && (
        <>
          <Bone width={180} />
          <div className="app-table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  {[0, 1, 2, 3].map((i) => (
                    <th key={i}>
                      <Bone width={95} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4].map((i) => (
                  <tr key={i}>
                    <td>
                      <Bone width={140} height={19} />
                      <Lines count={1} />
                    </td>
                    <td>
                      <Bone width={100} height={30} />
                    </td>
                    <td>
                      <Bone width={140} height={47} />
                    </td>
                    <td>
                      <Bone width={75} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {kind === "content" && (
        <div className="app-record-list">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div className="app-card app-card-header" key={i}>
              <Bone width="55%" height={22} />
              <Bone width={20} height={20} />
            </div>
          ))}
        </div>
      )}
      {kind === "form" && <FormBone fields={6} columns textarea />}
      {kind === "lists" && (
        <div className="app-admin-grid">
          {[0, 1, 2].map((i) => (
            <div className="app-card" key={i}>
              <Bone width={170} height={24} />
              <FormBone fields={1} />
              <Lines count={5} />
            </div>
          ))}
        </div>
      )}
      {kind === "administrators" && (
        <>
          <div className="app-card">
            <Bone width={210} height={24} />
            <FormBone fields={2} />
            <Lines count={3} />
          </div>
          <RecordBones count={2} actions />
        </>
      )}
      {kind === "registrations" && (
        <>
          <div className="app-card">
            <Bone width={150} height={22} />
          </div>
          <FilterBones count={2} />
          <RecordBones actions />
        </>
      )}
      {kind === "records" && <RecordBones actions={actions} />}
    </LoadingPage>
  );
}

// Used only while an authenticated layout itself is waiting. It exposes no
// user information or permission-dependent destinations. Nested loading files
// keep the real sidebar in place once the layout has resolved.
export function WorkspaceShellSkeleton({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  return (
    <div className={`app-workspace${admin ? " app-admin-frame" : ""}`}>
      <aside className="app-sidebar rh-skeleton-sidebar" aria-hidden="true">
        <Bone width={145} height={24} />
        <div className="rh-skeleton-sidebar-items">
          {Array.from({ length: admin ? 12 : 7 }, (_, i) => (
            <Bone key={i} width={i % 2 ? "85%" : "70%"} height={17} />
          ))}
        </div>
      </aside>
      {admin ? <div className="app-admin-content">{children}</div> : children}
    </div>
  );
}
