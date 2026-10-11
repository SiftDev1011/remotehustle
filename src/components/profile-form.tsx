import { ActionForm } from "./action-form";
import { Input, Select, TextArea, Notice } from "./ui";
import { saveProfileAction } from "@/actions/profile";
import { EMPLOYMENT_TYPES, type Profile, type ListItem } from "@/lib/domain";

export function ProfileForm({
  profile,
  skillIds,
  lists,
  allowMarketingChange = true,
}: {
  profile: Profile;
  skillIds: string[];
  lists: { categories: ListItem[]; locations: ListItem[]; skills: ListItem[] };
  allowMarketingChange?: boolean;
}) {
  return (
    <ActionForm
      action={saveProfileAction}
      label={
        allowMarketingChange ? "Save your profile" : "Save profile corrections"
      }
    >
      <input type="hidden" name="user_id" value={profile.user_id} />
      <div className="app-form-grid">
        <Input
          label="Full name"
          name="full_name"
          defaultValue={profile.full_name}
          required
          minLength={2}
          maxLength={120}
        />
        <Input
          label="Phone number"
          name="phone"
          type="tel"
          defaultValue={profile.phone || ""}
          autoComplete="tel"
          required
        />
        <Select
          label="Location"
          name="location_id"
          defaultValue={profile.location_id || ""}
        >
          <option value="">Choose your location</option>
          {lists.locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
        <Select
          label="Professional category"
          name="category_id"
          defaultValue={profile.category_id || ""}
        >
          <option value="">Choose your category</option>
          {lists.categories.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name}
            </option>
          ))}
        </Select>
      </div>
      {(!lists.categories.length ||
        !lists.skills.length ||
        !lists.locations.length) && (
        <Notice>
          The team needs to add categories, skills and locations before you can
          finish those parts of your profile.
        </Notice>
      )}
      <fieldset className="app-choice-group">
        <legend>Remote work skills</legend>
        <div className="app-checkbox-grid">
          {lists.skills.map((skill) => (
            <label className="app-checkbox" key={skill.id}>
              <input
                type="checkbox"
                name="skill_ids"
                value={skill.id}
                defaultChecked={skillIds.includes(skill.id)}
              />
              <span>{skill.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <TextArea
        label="Work experience"
        name="experience"
        defaultValue={profile.experience}
        rows={5}
        maxLength={5000}
        placeholder="Describe your experience. If you’re starting out, tell us about projects or practical work."
      />
      <TextArea
        label="Educational background"
        name="education"
        defaultValue={profile.education}
        rows={3}
        maxLength={3000}
      />
      <Input
        label="LinkedIn or professional profile URL"
        name="linkedin_url"
        type="url"
        defaultValue={profile.linkedin_url}
        placeholder="https://…"
      />
      <Input
        label="Preferred job roles (separate with commas)"
        name="preferred_roles"
        defaultValue={profile.preferred_roles.join(", ")}
        maxLength={2000}
      />
      <fieldset className="app-choice-group">
        <legend>Employment preferences</legend>
        <div className="app-checkbox-grid">
          {EMPLOYMENT_TYPES.map((type) => (
            <label className="app-checkbox" key={type}>
              <input
                type="checkbox"
                name="employment_preferences"
                value={type}
                defaultChecked={profile.employment_preferences.includes(type)}
              />
              <span>{type}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Input
        label="Areas of interest (separate with commas)"
        name="interests"
        defaultValue={profile.interests.join(", ")}
        maxLength={2000}
      />
      {allowMarketingChange && (
        <label className="app-checkbox">
          <input
            type="checkbox"
            name="marketing_consent"
            defaultChecked={profile.marketing_consent}
          />
          <span>Send me optional news and opportunities.</span>
        </label>
      )}
    </ActionForm>
  );
}
