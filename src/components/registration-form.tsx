"use client";
import { useActionState } from "react";
import { PhoneField } from "./phone-field";
import Link from "next/link";
import { Input, Select, TextArea, Notice } from "./ui";
import { submitRegistrationAction } from "@/actions/registration";
import {
  GENDERS,
  SKILL_LEVELS,
  PLATFORMS,
  REFERRALS,
} from "@/lib/registration";
import type { ActionState } from "@/lib/action-state";
export function RegistrationForm({
  email,
  name,
  phone,
  categories,
  countries,
}: {
  email: string;
  name: string;
  phone: string;
  categories: { id: string; name: string }[];
  countries: { code: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    submitRegistrationAction,
    {},
  );
  if (state.success)
    return (
      <Notice tone="success">
        {state.success}
        <p>Reference: {state.id}</p>
        <Link href="/registration">View your registration</Link>
      </Notice>
    );
  const options = (items: readonly string[]) =>
    items.map((v) => (
      <option key={v} value={v}>
        {v}
      </option>
    ));
  return (
    <form
      action={action}
      className="app-form"
      onReset={(e) => e.preventDefault()}
    >
      <fieldset disabled={pending} className="app-form-fields">
        <h2>Your details</h2>
        <div className="app-registration-grid">
          <Input
            name="full_name"
            label="Full name * (as it should appear on your certificate)"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            defaultValue={name}
          />
          <Input
            name="verified_email"
            label="Email address *"
            type="email"
            readOnly
            value={email}
          />
          <Input
            name="date_of_birth"
            label="Date of birth *"
            type="date"
            min="1900-01-01"
            max={new Date().toISOString().slice(0, 10)}
            autoComplete="bday"
            required
          />
          <PhoneField initial={phone} label="Phone number *" />
          <Select name="gender" label="Gender *" required defaultValue="">
            <option value="" disabled>
              Select gender
            </option>
            {options(GENDERS)}
          </Select>
          <Select name="country" label="Country *" required defaultValue="">
            <option value="" disabled>
              Select country
            </option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </Select>
          <Input
            name="state"
            label="State of residence *"
            required
            minLength={2}
            maxLength={120}
            autoComplete="address-level1"
          />
          <TextArea
            name="address"
            label="Street address *"
            required
            minLength={5}
            maxLength={500}
            autoComplete="street-address"
          />
        </div>
        <label className="app-checkbox">
          <input type="checkbox" name="whatsapp_active" required />
          <span>This phone number is active on WhatsApp. *</span>
        </label>
        <h2>Your interests</h2>
        <div className="app-registration-grid">
          <Select
            name="primary_platform"
            label="Primary social media platform *"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select platform
            </option>
            {options(PLATFORMS)}
          </Select>
          <Input
            name="social_handles"
            label="Social media username / handles *"
            required
            maxLength={500}
          />
          <Select
            name="category_id"
            label="Which category are you most interested in? *"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            name="skill_level"
            label="Current skill level in your selected category *"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select level
            </option>
            {options(SKILL_LEVELS)}
          </Select>
          <TextArea
            name="professional_platforms"
            label="Professional platforms you are registered on (optional)"
            maxLength={1000}
          />
          <Select
            name="heard_from"
            label="How did you hear about REMOTE HUSTLE? *"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Select source
            </option>
            {options(REFERRALS)}
          </Select>
        </div>
        <h2>Rules & agreement</h2>
        <label className="app-checkbox">
          <input type="checkbox" name="performance_agreement" required />
          <span>
            I understand that REMOTE HUSTLE is a performance-based programme and
            results depend on my participation and consistency. *
          </span>
        </label>
        <label className="app-checkbox">
          <input type="checkbox" name="community_agreement" required />
          <span>
            I agree to follow community rules, training guidelines and official
            announcements from REMOTE HUSTLE organisers. *
          </span>
        </label>
        <label className="app-checkbox">
          <input type="checkbox" name="privacy_acknowledged" required />
          <span>
            I acknowledge the{" "}
            <Link href="/privacy" target="_blank">
              Privacy Notice
            </Link>{" "}
            and the use of my details for programme communication, training,
            certificates and competitions. *
          </span>
        </label>
        <Input
          name="access_code"
          label="Access code *"
          required
          minLength={12}
          maxLength={80}
          autoComplete="off"
          spellCheck={false}
        />
        <button className="rm-btn" type="submit">
          {pending ? "Submitting…" : "Submit registration"}
        </button>
      </fieldset>
      {state.error && (
        <p className="app-form-error" role="alert">
          {state.error}
        </p>
      )}
    </form>
  );
}
