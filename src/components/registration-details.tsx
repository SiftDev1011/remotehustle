import {
  COUNTRIES,
  REGISTRATION_LABELS,
  type RegistrationRecord,
} from "@/lib/registration";
export function RegistrationDetails({
  record,
  category,
}: {
  record: RegistrationRecord;
  category?: string;
}) {
  return (
    <dl className="app-registration-summary">
      <dt>Email</dt>
      <dd>{record.email}</dd>
      <dt>Category</dt>
      <dd>{category || record.category_id}</dd>
      {Object.entries(REGISTRATION_LABELS).map(([k, label]) => {
        const v = record.data[k as keyof typeof record.data];
        const text =
          k === "country"
            ? COUNTRIES.find((c) => c.code === v)?.name || v
            : typeof v === "boolean"
              ? v
                ? "Agreed / confirmed"
                : "No"
              : v;
        return (
          <div key={k} style={{ display: "contents" }}>
            <dt>{label}</dt>
            <dd>{text || "Not provided"}</dd>
          </div>
        );
      })}
      <dt>Agreement version</dt>
      <dd>{record.agreement_version}</dd>
    </dl>
  );
}
