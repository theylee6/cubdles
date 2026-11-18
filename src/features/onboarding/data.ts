import "server-only";
import { createClient } from "@/lib/supabase/server";
import { GENDER_GROUPS, LOVE_LANGUAGES, type CuddleStyle, type GenderGroup, type Intention, type LoveLanguage, type Pace } from "./options";

/** Text columns with CHECK constraints come back as `string`; narrow them to the known values. */
function oneOf<T extends string>(allowed: readonly { value: T }[], v: string | null | undefined): T | null {
  return allowed.some((o) => o.value === v) ? (v as T) : null;
}
function manyOf<T extends string>(allowed: readonly { value: T }[], vs: string[] | null | undefined): T[] {
  return (vs ?? []).filter((v): v is T => allowed.some((o) => o.value === v));
}

export const PHOTO_URL_TTL_SECONDS = 60 * 60;

export type OwnPhoto = {
  id: string;
  position: number;
  moderationStatus: "pending" | "approved" | "rejected";
  url: string | null;
  width: number | null;
  height: number | null;
};

export type OnboardingData = {
  profile: {
    status: string;
    statusReason: string | null;
    onboardingStep: number;
    displayName: string | null;
    genderGroup: GenderGroup | null;
    genderIdentity: string | null;
    pronouns: string | null;
    intention: Intention | null;
    bio: string | null;
    jobTitle: string | null;
    education: string | null;
    city: string | null;
  };
  privateInfo: { birthDate: string | null; hasLocation: boolean; termsAccepted: boolean };
  preferences: { ageMin: number; ageMax: number; maxDistanceKm: number; showGenders: GenderGroup[] };
  affection: {
    cuddleStyle: CuddleStyle | null;
    pace: Pace | null;
    touchComfort: number | null;
    publicAffection: number | null;
    loveLanguages: LoveLanguage[];
  };
  lifestyle: Record<string, string | null>;
  interestIds: number[];
  prompts: { promptId: number; answer: string; position: number }[];
};

/** Everything the onboarding steps need about the signed-in member, in one round of parallel queries. */
export async function loadOnboardingData(userId: string): Promise<OnboardingData> {
  const supabase = await createClient();
  const [profile, priv, prefs, aff, life, interests, prompts] = await Promise.all([
    supabase
      .from("profiles")
      .select("status, status_reason, onboarding_step, display_name, gender_group, gender_identity, pronouns, intention, bio, job_title, education, city")
      .eq("id", userId)
      .single(),
    supabase.from("profile_private").select("birth_date, location, terms_accepted_at").eq("profile_id", userId).single(),
    supabase.from("preferences").select("age_min, age_max, max_distance_km, show_genders").eq("profile_id", userId).single(),
    supabase.from("affection_profiles").select("cuddle_style, pace, touch_comfort, public_affection, love_languages").eq("profile_id", userId).single(),
    supabase.from("lifestyle").select("drinking, smoking, exercise, kids, pets, diet").eq("profile_id", userId).single(),
    supabase.from("profile_interests").select("interest_id").eq("profile_id", userId),
    supabase.from("profile_prompts").select("prompt_id, answer, position").eq("profile_id", userId).order("position"),
  ]);

  if (profile.error || !profile.data) throw new Error(`Profile not found for ${userId}: ${profile.error?.code}`);
  const p = profile.data;

  return {
    profile: {
      status: p.status,
      statusReason: p.status_reason,
      onboardingStep: p.onboarding_step,
      displayName: p.display_name,
      genderGroup: oneOf(GENDER_GROUPS, p.gender_group),
      genderIdentity: p.gender_identity,
      pronouns: p.pronouns,
      intention: p.intention,
      bio: p.bio,
      jobTitle: p.job_title,
      education: p.education,
      city: p.city,
    },
    privateInfo: {
      birthDate: priv.data?.birth_date ?? null,
      hasLocation: Boolean(priv.data?.location),
      termsAccepted: Boolean(priv.data?.terms_accepted_at),
    },
    preferences: {
      ageMin: prefs.data?.age_min ?? 21,
      ageMax: prefs.data?.age_max ?? 40,
      maxDistanceKm: prefs.data?.max_distance_km ?? 25,
      showGenders: manyOf(GENDER_GROUPS, prefs.data?.show_genders),
    },
    affection: {
      cuddleStyle: aff.data?.cuddle_style ?? null,
      pace: aff.data?.pace ?? null,
      touchComfort: aff.data?.touch_comfort ?? null,
      publicAffection: aff.data?.public_affection ?? null,
      loveLanguages: manyOf(LOVE_LANGUAGES, aff.data?.love_languages),
    },
    lifestyle: life.data ?? {},
    interestIds: (interests.data ?? []).map((r) => r.interest_id),
    prompts: (prompts.data ?? []).map((r) => ({ promptId: r.prompt_id, answer: r.answer, position: r.position })),
  };
}

/** Catalogues (interests, prompts). Readable by any signed-in member. */
export async function loadCatalogues() {
  const supabase = await createClient();
  const [interests, prompts] = await Promise.all([
    supabase.from("interests").select("id, slug, label, category").order("category").order("label"),
    supabase.from("prompts").select("id, text").order("id"),
  ]);
  return {
    interests: (interests.data ?? []) as { id: number; slug: string; label: string; category: string }[],
    prompts: (prompts.data ?? []) as { id: number; text: string }[],
  };
}

/** The member's own photos (including pending ones), with short-lived signed URLs. */
export async function loadOwnPhotos(userId: string): Promise<OwnPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("photos")
    .select("id, position, moderation_status, storage_path, width, height")
    .eq("profile_id", userId)
    .order("position");
  if (error || !data?.length) return [];

  const { data: signed } = await supabase.storage
    .from("profile-photos")
    .createSignedUrls(data.map((p) => p.storage_path), PHOTO_URL_TTL_SECONDS);
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return data.map((p) => ({
    id: p.id,
    position: p.position,
    moderationStatus: p.moderation_status,
    url: urlByPath.get(p.storage_path) ?? null,
    width: p.width,
    height: p.height,
  }));
}
