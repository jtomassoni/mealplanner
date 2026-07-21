"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getDevLoginCredentials,
  isDevAuthBypassEnabled,
} from "@/lib/auth/dev-bypass";
import { getEnv } from "@/lib/env";
import { isEmailAllowed, normalizeEmail, parseAllowedEmails } from "@/lib/utils";

export type AuthActionResult = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  let env;
  try {
    env = getEnv();
  } catch {
    return {
      error:
        "App is not configured yet. Add Supabase and ALLOWED_EMAILS to .env.local.",
    };
  }

  const allowed = parseAllowedEmails(env.ALLOWED_EMAILS);
  if (!isEmailAllowed(email, allowed)) {
    return { error: "This email is not authorized to use this app." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: error.message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email || !isEmailAllowed(user.email, allowed)) {
    await supabase.auth.signOut();
    return { error: "This email is not authorized to use this app." };
  }

  redirect("/app/week");
}

/** One-click local login. Blocked unless ENABLE_DEV_AUTH_BYPASS=true on localhost. */
export async function devLoginAction(
  _prev: AuthActionResult,
  _formData?: FormData,
): Promise<AuthActionResult> {
  if (!isDevAuthBypassEnabled()) {
    return { error: "Dev login is disabled." };
  }

  const creds = getDevLoginCredentials();
  if (!creds) {
    return {
      error:
        "Set DEV_LOGIN_EMAIL and DEV_LOGIN_PASSWORD in .env.local (must match an allowed Supabase Auth user).",
    };
  }

  let env;
  try {
    env = getEnv();
  } catch {
    return { error: "App is not configured yet." };
  }

  const allowed = parseAllowedEmails(env.ALLOWED_EMAILS);
  if (!isEmailAllowed(creds.email, allowed)) {
    return {
      error: `DEV_LOGIN_EMAIL (${creds.email}) is not in ALLOWED_EMAILS.`,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });

  if (error) {
    return {
      error: `Dev login failed: ${error.message}. Create this user in Supabase Auth first.`,
    };
  }

  redirect("/app/week");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Email is required." };

  let env;
  try {
    env = getEnv();
  } catch {
    return { error: "App is not configured yet." };
  }

  const allowed = parseAllowedEmails(env.ALLOWED_EMAILS);
  if (!isEmailAllowed(email, allowed)) {
    // Do not reveal allowlist membership in detail
    return {
      success: true,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.APP_URL}/reset-password`,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function resetPasswordAction(
  _prev: AuthActionResult,
  formData: FormData,
): Promise<AuthActionResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/app/week");
}
