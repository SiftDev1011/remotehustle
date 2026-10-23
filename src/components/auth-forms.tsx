import { PhoneField } from "./phone-field";
import { Captcha } from "./captcha";
import Link from "next/link";
import { ActionForm } from "./action-form";
import { Input } from "./ui";
import {
  signUpAction,
  signInAction,
  resendVerificationAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "@/actions/auth";

export function SignUpForm({ next = "/workspace" }: { next?: string }) {
  return (
    <ActionForm
      action={signUpAction}
      label="Create your account"
      refresh={false}
    >
      <input type="hidden" name="next" value={next} />
      <Input
        label="Full name"
        name="full_name"
        autoComplete="name"
        required
        minLength={2}
        maxLength={120}
      />
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        maxLength={254}
      />
      <PhoneField />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        maxLength={128}
      />
      <p className="rm-note">
        Use at least 12 characters. You’ll add your professional details after
        verifying your email.
      </p>
      <label className="app-checkbox">
        <input name="consent" type="checkbox" required />
        <span>
          I agree to the{" "}
          <Link href="/terms" target="_blank">
            Terms
          </Link>{" "}
          and acknowledge the{" "}
          <Link href="/privacy" target="_blank">
            Privacy Notice
          </Link>
          .
        </span>
      </label>
      <label className="app-checkbox">
        <input name="marketing_consent" type="checkbox" />
        <span>
          Email me optional news and opportunities. I can change this choice in
          my profile.
        </span>
      </label>
      <Captcha />
    </ActionForm>
  );
}
export function SignInForm({ next }: { next: string }) {
  return (
    <ActionForm action={signInAction} label="Sign in" refresh={false}>
      <input type="hidden" name="next" value={next} />
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={128}
      />
      <Link className="rm-text-link" href="/forgot-password">
        Forgot your password?
      </Link>
      <Captcha />
    </ActionForm>
  );
}
export function VerificationForm({
  email,
  next = "/workspace",
}: {
  email: string;
  next?: string;
}) {
  return (
    <ActionForm
      action={resendVerificationAction}
      label="Resend verification email"
      refresh={false}
    >
      <input type="hidden" name="next" value={next} />
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={email}
        required
      />
      <Captcha />
    </ActionForm>
  );
}
export function ForgotPasswordForm() {
  return (
    <ActionForm
      action={forgotPasswordAction}
      label="Send reset link"
      refresh={false}
    >
      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
      />
      <Captcha />
    </ActionForm>
  );
}
export function ResetPasswordForm() {
  return (
    <ActionForm
      action={resetPasswordAction}
      label="Save new password"
      refresh={false}
    >
      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
      />
      <Input
        label="Confirm new password"
        name="password_confirm"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={128}
        required
      />
    </ActionForm>
  );
}
