"use server";

import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { fieldErrors, type FormState } from "@/lib/auth/schemas";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { dbErrorKey, ERROR_STEP, friendlyDbError } from "./errors";
import { CITIES, GENDER_GROUPS, LIFESTYLE_FIELDS, nearestCity } from "./options";
import {
  aboutSchema,
  affectionSchema,
  basicsSchema,
  birthdaySchema,
  interestsSchema,
  locationSchema,
  lookingForSchema,
  promptsSchema,
  readPromptAnswers,
} from "./schemas";
import { nextStepSlug, stepHref, stepNumber, type StepSlug } from "./steps";

type Ctx = { supabase: SupabaseClient; userId: string };

/**
 * Shared shape of every step action:
 *   auth → profile must be in onboarding → validate → write → record progress → go to next step.
 * Handlers return a FormState to show errors, or nothing to continue.
 */
async function runStep<S extends z.ZodType>(
  slug: StepSlug,
  schema: S,
  input: unknown,
  handler: (data: z.output<S>, ctx: Ctx) => Promise<FormState | void>,
): Promise<FormState> {
  if (!isSupabaseConfigured()) return { ok: false, message: "Accounts aren't connected yet." };
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(stepHref(slug))}`);

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).single();
  if (profile?.status !== "onboarding") redirect("/app");

  const result = await handler(parsed.data, { supabase, userId: user.id });
  if (result) return result;

  await markStepComplete(supabase, user.id, slug);
  const next = nextStepSlug(slug);
  redirect(next ? stepHref(next) : "/app");
}

/** Moves progress forward (a DB trigger stops it ever moving back). */
async function markStepComplete(supabase: SupabaseClient, userId: string, slug: StepSlug) {
  await supabase.from("profiles").update({ onboarding_step: stepNumber(slug) }).eq("id", userId);
}

function fail(error: { message?: string } | null): FormState {
  if (error) console.error("onboarding write failed:", error.message);
  return { ok: false, message: friendlyDbError(error) };
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

export async function saveBirthday(_prev: FormState, formData: FormData): Promise<FormState> {
  return runStep("birthday", birthdaySchema, Object.fromEntries(formData), async (data, { supabase, userId }) => {
    const { data: priv } = await supabase.from("profile_private").select("birth_date, terms_accepted_at").eq("profile_id", userId).single();

    if (!priv?.terms_accepted_at) {
      const { error } = await supabase.rpc("accept_terms", { p_marketing: formData.get("marketing") === "on" });
      if (error) return fail(error);
    }
    if (priv?.birth_date) return; // already set; can't be changed here

    const { data: adult, error } = await supabase.rpc("submit_birth_date", { p_birth_date: data.birthDate });
    if (error) return fail(error);
    if (adult === false) redirect("/app"); // account is now suspended; /app explains why
  });
}

export async function saveBasics(_prev: FormState, formData: FormData): Promise<FormState> {
  return runStep("basics", basicsSchema, Object.fromEntries(formData), async (data, { supabase, userId }) => {
    const groupLabel = GENDER_GROUPS.find((g) => g.value === data.genderGroup)!.label;
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: data.displayName,
        gender_group: data.genderGroup,
        gender_identity: data.genderIdentity ?? groupLabel,
        pronouns: data.pronouns,
      })
      .eq("id", userId);
    if (error) return fail(error);
  });
}

export async function saveLookingFor(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = {
    intention: formData.get("intention") ?? undefined,
    showGenders: formData.getAll("showGenders"),
    ageMin: formData.get("ageMin"),
    ageMax: formData.get("ageMax"),
  };
  return runStep("looking-for", lookingForSchema, input, async (data, { supabase, userId }) => {
    const [a, b] = await Promise.all([
      supabase.from("profiles").update({ intention: data.intention }).eq("id", userId),
      supabase
        .from("preferences")
        .update({ show_genders: data.showGenders, age_min: data.ageMin, age_max: data.ageMax })
        .eq("profile_id", userId),
    ]);
    if (a.error || b.error) return fail(a.error ?? b.error);
  });
}

export async function saveLocation(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = Object.fromEntries(formData);
  const input = { ...raw, lat: raw.lat || undefined, lng: raw.lng || undefined, city: raw.city || undefined };
  return runStep("location", locationSchema, input, async (data, { supabase, userId }) => {
    let point: { lat: number; lng: number };
    let cityLabel: string;
    if (data.mode === "device") {
      point = { lat: data.lat!, lng: data.lng! };
      cityLabel = nearestCity(point)?.name ?? "Elsewhere in India";
    } else {
      const city = CITIES.find((c) => c.name === data.city)!;
      point = { lat: city.lat, lng: city.lng };
      cityLabel = city.name;
    }

    const [loc, pref] = await Promise.all([
      supabase.rpc("set_location", { p_lat: point.lat, p_lng: point.lng, p_city: cityLabel }),
      supabase.from("preferences").update({ max_distance_km: data.distanceKm }).eq("profile_id", userId),
    ]);
    if (loc.error || pref.error) return fail(loc.error ?? pref.error);
  });
}

export async function saveAffection(_prev: FormState, formData: FormData): Promise<FormState> {
  const input = {
    cuddleStyle: formData.get("cuddleStyle") ?? undefined,
    pace: formData.get("pace") ?? undefined,
    touchComfort: formData.get("touchComfort") ?? undefined,
    publicAffection: formData.get("publicAffection") || undefined,
    loveLanguages: formData.getAll("loveLanguages"),
  };
  return runStep("affection", affectionSchema, input, async (data, { supabase, userId }) => {
    const { error } = await supabase
      .from("affection_profiles")
      .update({
        cuddle_style: data.cuddleStyle,
        pace: data.pace,
        touch_comfort: data.touchComfort,
        public_affection: data.publicAffection ?? null,
        love_languages: data.loveLanguages,
      })
      .eq("profile_id", userId);
    if (error) return fail(error);
  });
}

export async function saveInterests(_prev: FormState, formData: FormData): Promise<FormState> {
  const input: Record<string, unknown> = { interestIds: formData.getAll("interestIds") };
  for (const key of Object.keys(LIFESTYLE_FIELDS)) input[key] = formData.get(key) ?? "";
  return runStep("interests", interestsSchema, input, async (data, { supabase, userId }) => {
    const lifestyle = Object.fromEntries(Object.keys(LIFESTYLE_FIELDS).map((k) => [k, (data as Record<string, unknown>)[k] ?? null]));
    const [a, b] = await Promise.all([
      supabase.rpc("set_profile_interests", { p_ids: data.interestIds }),
      supabase.from("lifestyle").update(lifestyle).eq("profile_id", userId),
    ]);
    if (a.error || b.error) return fail(a.error ?? b.error);
  });
}

/** The photos step has its own upload actions (./photo-actions); this just checks the minimum and moves on. */
export async function continueFromPhotos(_prev: FormState, _formData: FormData): Promise<FormState> {
  void _formData;
  return runStep("photos", z.object({}), {}, async (_data, { supabase, userId }) => {
    const { count } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", userId)
      .neq("moderation_status", "rejected");
    if ((count ?? 0) < 2) return { ok: false, message: "Add at least 2 photos to continue." };
  });
}

export async function savePrompts(_prev: FormState, formData: FormData): Promise<FormState> {
  return runStep("prompts", promptsSchema, { answers: readPromptAnswers(formData) }, async (data, { supabase }) => {
    const { error } = await supabase.rpc("set_profile_prompts", {
      p_answers: data.answers.map((a) => ({ prompt_id: a.promptId, answer: a.answer })),
    });
    if (error) return fail(error);
  });
}

export async function saveAbout(_prev: FormState, formData: FormData): Promise<FormState> {
  return runStep("about", aboutSchema, Object.fromEntries(formData), async (data, { supabase, userId }) => {
    const { error } = await supabase
      .from("profiles")
      .update({ bio: data.bio, job_title: data.jobTitle, education: data.education })
      .eq("id", userId);
    if (error) return fail(error);
  });
}

export type FinishState = FormState & { fixStep?: string };

export async function finishOnboarding(_prev: FinishState, _formData: FormData): Promise<FinishState> {
  void _formData;
  if (!isSupabaseConfigured()) return { ok: false, message: "Accounts aren't connected yet." };
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(stepHref("review"))}`);

  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_onboarding");
  if (error) {
    const key = dbErrorKey(error);
    if (key === "not_in_onboarding") redirect("/app");
    return { ok: false, message: friendlyDbError(error), fixStep: key ? ERROR_STEP[key] : undefined };
  }
  redirect("/app?welcome=1");
}
