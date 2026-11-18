/** Friendly copy for errors raised by our database functions (see supabase/migrations). */
const DB_ERRORS: Record<string, string> = {
  birth_date_already_set: "Your date of birth is already saved. Contact us if it needs correcting.",
  invalid_birth_date: "That date doesn't look right.",
  photo_limit_reached: "You can have up to 6 photos. Remove one to add another.",
  invalid_storage_path: "That upload didn't work. Please try again.",
  profile_interests_limit_reached: "Pick up to 10 interests.",
  unknown_interest: "One of those interests isn't available any more. Please choose again.",
  profile_prompts_limit_reached: "Up to three prompts.",
  unknown_prompt: "One of those prompts isn't available any more. Please choose again.",
  duplicate_prompt: "Choose a different prompt for each answer.",
  invalid_photo_list: "Your photos changed in another tab. Please refresh and try again.",
  not_in_onboarding: "Your profile is already set up.",
  age_not_verified: "Please add your date of birth.",
  consent_missing: "Please accept the Terms and Privacy Policy.",
  profile_incomplete: "Please add your name, gender and what you're looking for.",
  preferences_missing: "Please choose who you'd like to meet.",
  location_missing: "Please add your location.",
  affection_missing: "Please finish your affection profile.",
  photos_missing: "Please add at least 2 photos.",
  prompts_missing: "Please answer at least one prompt.",
};

/** Which step fixes each completion error, so the review screen can link straight there. */
export const ERROR_STEP: Record<string, string> = {
  age_not_verified: "birthday",
  consent_missing: "birthday",
  profile_incomplete: "basics",
  preferences_missing: "looking-for",
  location_missing: "location",
  affection_missing: "affection",
  photos_missing: "photos",
  prompts_missing: "prompts",
};

export function dbErrorKey(error: { message?: string } | null | undefined): string | null {
  const msg = error?.message ?? "";
  return Object.keys(DB_ERRORS).find((k) => msg.includes(k)) ?? null;
}

export function friendlyDbError(error: { message?: string; code?: string } | null | undefined): string {
  const key = dbErrorKey(error);
  return key ? DB_ERRORS[key] : "Something went wrong saving that. Please try again.";
}
