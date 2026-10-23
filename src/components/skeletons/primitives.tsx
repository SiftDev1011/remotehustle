import type { CSSProperties, ReactNode } from "react";

// Skeletons borrow the live components' layout classes. Only the placeholders
// are styled here, so changes to columns, gutters and breakpoints stay in sync.
export function Bone({
  width = "100%",
  height = 14,
  className = "",
}: {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  className?: string;
}) {
  return <span className={`rh-bone ${className}`} style={{ width, height }} />;
}

export function Lines({ count = 3 }: { count?: number }) {
  return (
    <div className="rh-skeleton-lines">
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} width={i === count - 1 ? "68%" : "100%"} />
      ))}
    </div>
  );
}

export function ButtonBone({ width = 140 }: { width?: number }) {
  return <Bone width={width} height={47} className="rh-skeleton-button" />;
}

export function CrumbBone() {
  return (
    <div className="rm-breadcrumb rh-skeleton-crumb">
      <Bone width={48} height={13} />
      <Bone width={155} height={13} />
    </div>
  );
}

export function HeadingBone({
  description = true,
  spacious = false,
  eyebrow = false,
}: {
  description?: boolean;
  spacious?: boolean;
  eyebrow?: boolean;
}) {
  return (
    <div className={`rm-page-head ${spacious ? "" : "app-page-head-compact"}`}>
      <div className="rh-skeleton-heading">
        {eyebrow && <Bone width={140} height={12} />}
        <Bone
          width="min(78%, 420px)"
          height={spacious ? 72 : "clamp(30px, 3.75vw, 40px)"}
        />
        {description && (
          <div className="rh-skeleton-description">
            <Lines count={2} />
          </div>
        )}
      </div>
    </div>
  );
}

export function FieldBone({ tall = false }: { tall?: boolean }) {
  return (
    <div className="app-field">
      <Bone width={110} height={16} />
      <Bone height={tall ? 140 : 50} />
    </div>
  );
}

export function ChoiceBones({ count = 2 }: { count?: number }) {
  return (
    <div className="rh-skeleton-stack">
      {Array.from({ length: count }, (_, i) => (
        <div className="app-checkbox" key={i}>
          <Bone width={18} height={18} />
          <Bone width="75%" />
        </div>
      ))}
    </div>
  );
}

export function PhoneBone() {
  return (
    <div className="app-phone-field">
      <FieldBone />
      <FieldBone />
      <div className="app-phone-help">
        <Lines count={2} />
      </div>
    </div>
  );
}

export function FormBone({
  fields = 4,
  columns = false,
  textarea = false,
}: {
  fields?: number;
  columns?: boolean;
  textarea?: boolean;
}) {
  return (
    <div className="app-form">
      <div className="app-form-fields">
        <div className={columns ? "app-form-grid" : "rh-skeleton-stack"}>
          {Array.from({ length: fields }, (_, i) => (
            <FieldBone key={i} />
          ))}
        </div>
        {textarea && <FieldBone tall />}
        <ButtonBone />
      </div>
    </div>
  );
}

export function RecordBones({
  count = 3,
  actions = false,
  compact = false,
}: {
  count?: number;
  actions?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="app-record-list">
      {Array.from({ length: count }, (_, i) => (
        <div className="app-card" key={i}>
          <div className="app-card-header">
            <div className="rh-skeleton-record-copy">
              <Bone width="75%" height={24} />
              <Lines count={compact ? 1 : 2} />
            </div>
            <Bone width={85} height={30} />
          </div>
          {actions && (
            <div className="rm-actions">
              <ButtonBone />
              <Bone width={95} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function FilterBones({
  count = 2,
  searchbar = false,
}: {
  count?: number;
  searchbar?: boolean;
}) {
  return (
    <div className={searchbar ? "rm-searchbar" : "app-filter-bar"}>
      {Array.from({ length: count }, (_, i) => (
        <div className="rh-skeleton-filter" key={i}>
          <FieldBone />
        </div>
      ))}
      <ButtonBone width={100} />
    </div>
  );
}

export function LoadingPage({
  children,
  className = "rm-page rm-shell",
  label = "page",
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <main
      id="rh-main"
      className={`${className} rh-loading-page`}
      aria-busy="true"
      aria-label={`Loading ${label}`}
    >
      <span className="rh-a11y" role="status">
        Loading {label}.
      </span>
      <div className="rh-skeleton-content" aria-hidden="true">
        {children}
      </div>
    </main>
  );
}
