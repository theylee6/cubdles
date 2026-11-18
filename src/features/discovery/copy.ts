import { CUDDLE_STYLES, INTENTIONS, LIFESTYLE_FIELDS, LOVE_LANGUAGES, PACES, labelFor } from "@/features/onboarding/options";
import type { DistanceBucket, Reason } from "./types";

/** Turns compatibility reason codes into short, warm copy. Pure — easy to localise later. */
export function reasonText(r: Reason): string | null {
  switch (r.code) {
    case "same_intention":
      return `You're both looking for ${(labelFor(INTENTIONS, r.value) ?? "the same thing").toLowerCase()}`;
    case "same_pace":
      return `Same pace: ${(labelFor(PACES, r.value) ?? "").toLowerCase()}`;
    case "spoons_fit":
      return "Big spoon, meet little spoon";
    case "both_cuddly":
      return "You both love a good cuddle";
    case "same_love_language":
      return `You both value ${(labelFor(LOVE_LANGUAGES, r.value) ?? "the same things").toLowerCase()}`;
    case "shared_interests":
      return r.count === 1 ? "1 shared interest" : `${r.count} shared interests`;
    default:
      return null;
  }
}

const DISTANCE: Record<DistanceBucket, string> = {
  under_5: "Under 5 km away",
  "5_10": "5–10 km away",
  "10_25": "10–25 km away",
  "25_50": "25–50 km away",
  "50_plus": "More than 50 km away",
};

export function distanceText(bucket: DistanceBucket | null): string | null {
  return bucket ? DISTANCE[bucket] : null;
}

export function cuddleStyleText(v: string | null | undefined) {
  return labelFor(CUDDLE_STYLES, v);
}
export function paceText(v: string | null | undefined) {
  return labelFor(PACES, v);
}
export function intentionText(v: string | null | undefined) {
  return labelFor(INTENTIONS, v);
}
export function loveLanguageText(v: string) {
  return labelFor(LOVE_LANGUAGES, v) ?? v;
}

export function lifestyleText(key: string, value: string | null): string | null {
  if (!value) return null;
  const field = LIFESTYLE_FIELDS[key as keyof typeof LIFESTYLE_FIELDS];
  if (!field) return null;
  const label = field.options.find(([v]) => v === value)?.[1];
  return label ? `${field.label}: ${label}` : null;
}

/** "Active today", "Active this week" — never an exact time. */
export function lastActiveText(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const hours = (now - Date.parse(iso)) / 36e5;
  if (hours < 24) return "Active today";
  if (hours < 24 * 7) return "Active this week";
  return null;
}

const SWIPE_ERRORS: Record<string, string> = {
  like_limit_reached: "You've used today's likes. They refresh at midnight.",
  super_like_limit_reached: "You've used this week's super like.",
  premium_required: "That's part of Cubdles Plus.",
  target_unavailable: "This profile isn't available any more.",
  profile_not_active: "Your profile isn't active, so you can't like people right now.",
  note_too_long: "Notes can be up to 140 characters.",
  match_not_found: "That match has already ended.",
};

export function swipeErrorKey(message: string | undefined): string {
  return Object.keys(SWIPE_ERRORS).find((k) => message?.includes(k)) ?? "unknown";
}

export function swipeErrorText(key: string): string {
  return SWIPE_ERRORS[key] ?? "Something went wrong. Please try again.";
}
