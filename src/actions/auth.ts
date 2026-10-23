"use server";
import { normalizeInternationalPhone } from "@/lib/international-phone";
import { authCaptcha } from "@/lib/captcha";
import { redirect } from "next/navigation";
import { z } from "zod";
import { serverDb } from "@/lib/supabase/server";
import { getContext } from "@/lib/auth";
import { appUrl } from "@/lib/env";
import { safeNext } from "@/lib/domain";
import {
  signupSchema,
  emailSchema,
  passwordSchema,
  validationMessage,
} from "@/lib/validation";
import { publicError } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

function authError(error: { code?: string; message?: string }) {
  if (["email_exists", "user_already_exists"].includes(error.code || ""))
    return "This email is already registered. Sign in or reset your password.";
  if (error.code === "captcha_failed")
    return "Complete the security check and try again.";
  if (error.code === "invalid_credentials")
    return "The email or password is incorrect.";
  if (error.code === "email_not_confirmed")
    return "Verify your email before signing in.";
  if (
    error.code?.includes("rate_limit") ||
    error.code === "over_request_rate_limit"
  )
    return "Too many attempts. Please wait before trying again.";
  if (error.message?.includes("Database error saving new user"))
    return "Unable to register. Check your phone number; it may already be registered.";
  if (error.code === "otp_expired")
    return "This link expired. Request a new email.";
  return publicError(error);
}
export async function signUpAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  let email: string;
  const next = safeNext(form.get("next"));
  try {
    let phone: string;
    try {
      phone = normalizeInternationalPhone(
        form.get("phone"),
        form.get("phone_country") || "NG",
      );
    } catch (e) {
      return {
        error: e instanceof Error ? e.message : "Check your phone number.",
      };
    }
    const result = signupSchema.safeParse({
      full_name: form.get("full_name"),
      email: form.get("email"),
      phone,
      password: form.get("password"),
      consent: form.get("consent") === "on",
      marketing_consent: form.get("marketing_consent") === "on",
    });
    if (!result.success) return { error: validationMessage(result.error) };
    email = result.data.email;
    const { password, ...metadata } = result.data;
    const db = await serverDb();
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        captchaToken: authCaptcha(form),
        emailRedirectTo:
          appUrl() +
          "/auth/confirm?next=" +
          encodeURIComponent(safeNext(form.get("next"))),
      },
    });
    if (error) return { error: authError(error) };
    if (!data.user || data.user.identities?.length === 0)
      return {
        error:
          "This email may already be registered. Sign in or reset your password.",
      };
    // Verification is mandatory. Sign out if someone disabled confirmation in Supabase settings.
    if (data.session) await db.auth.signOut();
  } catch (error) {
    return { error: publicError(error) };
  }
  redirect(
    "/verify-email?email=" +
      encodeURIComponent(email) +
      "&next=" +
      encodeURIComponent(next),
  );
}
export async function signInAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  let destination = safeNext(form.get("next"));
  try {
    const result = z
      .object({ email: emailSchema, password: z.string().min(1).max(128) })
      .safeParse({ email: form.get("email"), password: form.get("password") });
    if (!result.success) return { error: validationMessage(result.error) };
    const db = await serverDb();
    const { error } = await db.auth.signInWithPassword({
      ...result.data,
      options: { captchaToken: authCaptcha(form) },
    });
    if (error) return { error: authError(error) };
    const context = await getContext();
    if (context?.membership?.active && destination === "/workspace")
      destination = "/admin";
  } catch (error) {
    return { error: publicError(error) };
  }
  redirect(destination);
}
export async function resendVerificationAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const result = emailSchema.safeParse(form.get("email"));
    if (!result.success) return { error: validationMessage(result.error) };
    const db = await serverDb();
    const { error } = await db.auth.resend({
      type: "signup",
      email: result.data,
      options: {
        captchaToken: authCaptcha(form),
        emailRedirectTo:
          appUrl() +
          "/auth/confirm?next=" +
          encodeURIComponent(safeNext(form.get("next"))),
      },
    });
    if (error) return { error: authError(error) };
    return {
      success:
        "If this account needs verification, a new email is on its way. Check your inbox and spam folder.",
    };
  } catch (error) {
    return { error: publicError(error) };
  }
}
export async function forgotPasswordAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const result = emailSchema.safeParse(form.get("email"));
    if (!result.success) return { error: validationMessage(result.error) };
    const db = await serverDb();
    const { error } = await db.auth.resetPasswordForEmail(result.data, {
      captchaToken: authCaptcha(form),
      redirectTo: appUrl() + "/auth/confirm?next=/reset-password",
    });
    if (error) return { error: authError(error) };
    return {
      success:
        "If this email belongs to an account, we have sent a password reset link.",
    };
  } catch (error) {
    return { error: publicError(error) };
  }
}
export async function resetPasswordAction(
  _previous: ActionState,
  form: FormData,
): Promise<ActionState> {
  try {
    const result = passwordSchema.safeParse(form.get("password"));
    if (!result.success) return { error: validationMessage(result.error) };
    if (result.data !== form.get("password_confirm"))
      return { error: "The passwords do not match." };
    const db = await serverDb();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return {
        error:
          "This link expired or is invalid. Request another password reset email.",
      };
    const { error } = await db.auth.updateUser({ password: result.data });
    if (error) return { error: authError(error) };
    await db.auth.signOut();
  } catch (error) {
    return { error: publicError(error) };
  }
  redirect("/sign-in?reset=1");
}
export async function signOutAction() {
  const db = await serverDb();
  await db.auth.signOut();
  redirect("/sign-in");
}
