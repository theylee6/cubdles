import type { Option } from "@/components/ui/choice";

/** Closed sets mirror database enums/checks. Labels are UI copy and can change freely. */

export const GENDER_GROUPS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "nonbinary", label: "Non-binary" },
] as const satisfies readonly Option[];
export type GenderGroup = (typeof GENDER_GROUPS)[number]["value"];

export const SHOW_ME = [
  { value: "woman", label: "Women" },
  { value: "man", label: "Men" },
  { value: "nonbinary", label: "Non-binary people" },
] as const satisfies readonly Option[];

export const INTENTIONS = [
  { value: "life_partner", label: "A life partner", description: "Looking for the one to build a life with." },
  { value: "long_term", label: "Something long-term", description: "A real relationship that lasts." },
  { value: "long_term_open", label: "Long-term, open to short", description: "Hoping for long-term, happy to see where it goes." },
  { value: "short_term_open", label: "Short-term, open to long", description: "Keeping it light, open to more." },
  { value: "figuring_out", label: "Still figuring it out", description: "Not sure yet, and that's okay." },
] as const satisfies readonly Option[];
export type Intention = (typeof INTENTIONS)[number]["value"];

export const CUDDLE_STYLES = [
  { value: "big_spoon", label: "Big spoon" },
  { value: "little_spoon", label: "Little spoon" },
  { value: "either", label: "Either, happily" },
  { value: "not_sure", label: "Not sure yet" },
] as const satisfies readonly Option[];
export type CuddleStyle = (typeof CUDDLE_STYLES)[number]["value"];

export const PACES = [
  { value: "slow", label: "Slow & steady", description: "I like to get to know someone first." },
  { value: "steady", label: "Somewhere in between", description: "Comfortable once there's a spark." },
  { value: "quick", label: "I warm up fast", description: "Affectionate early on." },
] as const satisfies readonly Option[];
export type Pace = (typeof PACES)[number]["value"];

export const LOVE_LANGUAGES = [
  { value: "words", label: "Kind words" },
  { value: "time", label: "Quality time" },
  { value: "touch", label: "Touch" },
  { value: "acts", label: "Little acts" },
  { value: "gifts", label: "Thoughtful gifts" },
] as const satisfies readonly Option[];
export type LoveLanguage = (typeof LOVE_LANGUAGES)[number]["value"];

export const LIFESTYLE_FIELDS = {
  drinking: { label: "Drinking", options: [["never", "Never"], ["sometimes", "Sometimes"], ["often", "Often"], ["prefer_not", "Prefer not to say"]] },
  smoking: { label: "Smoking", options: [["never", "Never"], ["sometimes", "Sometimes"], ["often", "Often"], ["prefer_not", "Prefer not to say"]] },
  exercise: { label: "Exercise", options: [["rarely", "Rarely"], ["sometimes", "Sometimes"], ["often", "Often"]] },
  kids: { label: "Children", options: [["have", "Have children"], ["want", "Want children"], ["dont_want", "Don't want children"], ["open", "Open to it"], ["prefer_not", "Prefer not to say"]] },
  pets: { label: "Pets", options: [["dog", "Dog person"], ["cat", "Cat person"], ["both", "Both"], ["other", "Other pets"], ["none", "No pets"], ["want", "Want one"]] },
  diet: { label: "Diet", options: [["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["eggetarian", "Eggetarian"], ["non_vegetarian", "Eats meat"], ["jain", "Jain"], ["other", "Other"]] },
} as const;
export type LifestyleKey = keyof typeof LIFESTYLE_FIELDS;

export const DISTANCES_KM = [5, 10, 25, 50, 100, 200] as const;

export type DistanceUnit = "km" | "mi";

/** Search radius options, stored in km. Shown in the member's unit. */
export function distanceOptionLabel(km: number, unit: DistanceUnit): string {
  return unit === "mi" ? `${Math.round(km * 0.621371)} mi` : `${km} km`;
}

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** English country name for an ISO code, e.g. "GB" → "United Kingdom". */
export function countryName(code: string | null | undefined): string | null {
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function labelFor<T extends readonly Option[]>(options: T, value: string | null | undefined): string | null {
  return options.find((o) => o.value === value)?.label ?? null;
}
