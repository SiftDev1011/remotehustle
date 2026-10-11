"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Captcha } from "./captcha";
import { Input, TextArea } from "./ui";
export function ContactForm() {
  const [values, setValues] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    consent: false,
  });
  const [state, submit, pending] = useActionState(
    async (
      _previous: { error?: string; success?: boolean },
      form: FormData,
    ): Promise<{ error?: string; success?: boolean }> => {
      try {
        const response = await fetch("/api/contact", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            subject: form.get("subject"),
            message: form.get("message"),
            consent: form.get("consent") === "on",
            website: form.get("website") || "",
            captcha_token: form.get("captcha_token") || "",
          }),
        });
        const data = await response.json();
        return response.ok
          ? { success: true }
          : { error: data.error || "Please try again." };
      } catch {
        return {
          error:
            "We couldn’t send your message. Check your connection and try again.",
        };
      }
    },
    {},
  );
  if (state.success)
    return (
      <div className="app-notice app-notice-success" role="status">
        Your message has reached our team. We’ll respond using the email address
        you provided.
      </div>
    );
  return (
    <form
      action={submit}
      className="app-form"
      onReset={(event) => event.preventDefault()}
    >
      <fieldset className="app-form-fields" disabled={pending}>
        <Input
          label="Your name"
          name="name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          autoComplete="name"
          required
          minLength={2}
          maxLength={120}
        />
        <Input
          label="Email address"
          name="email"
          value={values.email}
          onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
          type="email"
          autoComplete="email"
          required
          maxLength={254}
        />
        <Input
          label="Subject"
          name="subject"
          value={values.subject}
          onChange={(e) =>
            setValues((v) => ({ ...v, subject: e.target.value }))
          }
          required
          minLength={3}
          maxLength={160}
        />
        <TextArea
          label="How can we help?"
          name="message"
          value={values.message}
          onChange={(e) =>
            setValues((v) => ({ ...v, message: e.target.value }))
          }
          required
          minLength={10}
          maxLength={4000}
          rows={5}
        />
        <div className="app-honeypot" aria-hidden="true">
          <label>
            Leave this field empty
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
        <label className="app-checkbox">
          <input
            type="checkbox"
            name="consent"
            checked={values.consent}
            onChange={(e) =>
              setValues((v) => ({ ...v, consent: e.target.checked }))
            }
            required
          />
          <span>
            I acknowledge the <Link href="/privacy">Privacy notice</Link> and
            understand my details will be used to respond to this enquiry.
          </span>
        </label>
        <Captcha action="contact" />
        <button className="rm-btn" type="submit">
          {pending ? "Sending…" : "Send message"}
        </button>
      </fieldset>
      {state.error && (
        <p role="alert" className="app-form-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
