import { ActionForm } from "./action-form";
import { Input, Select, TextArea } from "./ui";
import { saveJobAction } from "@/actions/jobs";
import { EMPLOYMENT_TYPES, type Job, type ListItem } from "@/lib/domain";
export function JobForm({
  job,
  lists,
}: {
  job?: Job;
  lists: { categories: ListItem[]; locations: ListItem[] };
}) {
  return (
    <ActionForm
      action={saveJobAction}
      label={job ? "Save opportunity" : "Create opportunity"}
    >
      {job && <input type="hidden" name="id" value={job.id} />}
      <div className="app-form-grid">
        <Input
          name="title"
          label="Job title"
          defaultValue={job?.title}
          required
          minLength={3}
          maxLength={180}
        />
        <Input
          name="company"
          label="Company"
          defaultValue={job?.company}
          required
          minLength={2}
          maxLength={180}
        />
      </div>
      <TextArea
        name="description"
        label="Description"
        defaultValue={job?.description}
        required
        minLength={20}
        maxLength={15000}
        rows={8}
      />
      <TextArea
        name="requirements"
        label="Requirements"
        defaultValue={job?.requirements}
        required
        minLength={5}
        maxLength={10000}
        rows={5}
      />
      <div className="app-form-grid">
        <Select
          label="Category"
          name="category_id"
          defaultValue={job?.category_id || ""}
        >
          <option value="">Choose a category</option>
          {lists.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Location eligibility"
          name="location_id"
          defaultValue={job?.location_id || ""}
        >
          <option value="">Any location</option>
          {lists.locations.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          label="Employment type"
          name="employment_type"
          defaultValue={job?.employment_type || "full-time"}
        >
          {EMPLOYMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Select
          label="Application type"
          name="application_type"
          defaultValue={job?.application_type || "internal"}
        >
          <option value="internal">Apply here</option>
          <option value="external">Apply on company site</option>
        </Select>
      </div>
      <Input
        label="Company application link (required for external applications)"
        name="application_url"
        type="url"
        placeholder="https://…"
        defaultValue={job?.application_url || ""}
      />
      <div className="app-form-grid">
        <Input
          label="Minimum pay (optional)"
          name="salary_min"
          type="number"
          min="0"
          step="0.01"
          defaultValue={job?.salary_min ?? ""}
        />
        <Input
          label="Maximum pay (optional)"
          name="salary_max"
          type="number"
          min="0"
          step="0.01"
          defaultValue={job?.salary_max ?? ""}
        />
        <Input
          label="Currency"
          name="currency"
          defaultValue={job?.currency || "NGN"}
          required
          pattern="[A-Z]{3}"
          maxLength={3}
        />
        <Select
          name="salary_period"
          label="Pay period"
          defaultValue={job?.salary_period || "month"}
        >
          {["month", "year", "hour", "project"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </Select>
        <Select
          name="status"
          label="Publication status"
          defaultValue={job?.status || "draft"}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
        </Select>
        <Input
          name="closes_at"
          label="Closing date (optional)"
          type="date"
          defaultValue={job?.closes_at?.slice(0, 10) || ""}
        />
      </div>
      <p className="rm-note">
        Pay fields are optional. Leave them blank if compensation has not been
        confirmed.
      </p>
    </ActionForm>
  );
}
