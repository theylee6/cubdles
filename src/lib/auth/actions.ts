"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/utils";
import {
  type FormState,
  fieldErrors,
  newPasswordSchema,
  resetRequestSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

const NOT_CONFIGURED: FormState = {
  ok: false,
  message: "Accounts aren't switched on yet: this site isn't connected to its database. Please try again later.",
};

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : publicEnv.NEXT_PUBLIC_SITE_URL;
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error), values: { email: raw.email ?? "" } };
  }
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/app` },
  });

  if (error) {
    // Don't reveal whether an email is already registered.
    if (error.code === "weak_password") {
      return { ok: false, errors: { password: error.message }, values: { email: parsed.data.email } };
    }
    if (error.status === 429) {
      return { ok: false, message: "Too many attempts. Please wait a minute and try again." };
    }
    console.error("signUp failed", error.code, error.status);
    return { ok: false, message: "We couldn't create your account just now. Please try again." };
  }

  return {
    ok: true,
    message: `We've sent a confirmation link to ${parsed.data.email}. Open it on this device to continue.`,
  };
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = signInSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, errors: fieldErrors(parsed.error), values: { email: raw.email ?? "" } };
  }
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, message: "Please confirm your email first — check your inbox for our link.", values: { email: parsed.data.email } };
    }
    if (error.status === 429) {
      return { ok: false, message: "Too many attempts. Please wait a minute and try again." };
    }
    return { ok: false, message: "That email and password don't match.", values: { email: parsed.data.email } };
  }

  redirect(safeNextPath(raw.next));
}

export async function oauthAction(formData: FormData): Promise<void> {
  const provider = formData.get("provider");
  if (provider !== "google" && provider !== "apple") redirect("/login?error=provider");
  if (!isSupabaseConfigured()) redirect("/login?error=not_configured");

  const supabase = await createClient();
  const origin = await siteOrigin();
  const next = safeNextPath(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/login?error=${provider}_unavailable`);
  redirect(data.url);
}

export async function requestPasswordResetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = resetRequestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const origin = await siteOrigin();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password/new`,
  });
  // Same answer whether or not the account exists.
  return { ok: true, message: "If that email has an account, a reset link is on its way." };
}

export async function updatePasswordAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  if (!isSupabaseConfigured()) return NOT_CONFIGURED;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) {
    return { ok: false, message: "Your reset link has expired. Please request a new one." };
  }
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.code === "same_password" ? "Please choose a new password." : "We couldn't update your password. Please try again." };
  redirect("/app");
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
