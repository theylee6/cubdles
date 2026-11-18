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
  diet: { label: "Diet", options: [["vegetarian", "Vegetarian"], ["vegan", "Vegan"], ["eggetarian", "Eggetarian"], ["non_vegetarian", "Non-vegetarian"], ["jain", "Jain"], ["other", "Other"]] },
} as const;
export type LifestyleKey = keyof typeof LIFESTYLE_FIELDS;

export const DISTANCES_KM = [5, 10, 25, 50, 100, 200] as const;

/**
 * Launch cities with approximate centre coordinates. Used when a member picks a city
 * instead of sharing their location, and to name the nearest city for shared locations.
 */
export const CITIES = [
  { name: "Ahmedabad", lat: 23.02, lng: 72.57 },
  { name: "Bengaluru", lat: 12.97, lng: 77.59 },
  { name: "Bhopal", lat: 23.26, lng: 77.41 },
  { name: "Bhubaneswar", lat: 20.3, lng: 85.82 },
  { name: "Chandigarh", lat: 30.73, lng: 76.78 },
  { name: "Chennai", lat: 13.08, lng: 80.27 },
  { name: "Coimbatore", lat: 11.02, lng: 76.96 },
  { name: "Delhi", lat: 28.61, lng: 77.21 },
  { name: "Goa", lat: 15.5, lng: 73.83 },
  { name: "Gurugram", lat: 28.46, lng: 77.03 },
  { name: "Guwahati", lat: 26.14, lng: 91.74 },
  { name: "Hyderabad", lat: 17.39, lng: 78.49 },
  { name: "Indore", lat: 22.72, lng: 75.86 },
  { name: "Jaipur", lat: 26.91, lng: 75.79 },
  { name: "Kochi", lat: 9.93, lng: 76.27 },
  { name: "Kolkata", lat: 22.57, lng: 88.36 },
  { name: "Lucknow", lat: 26.85, lng: 80.95 },
  { name: "Mumbai", lat: 19.08, lng: 72.88 },
  { name: "Mysuru", lat: 12.3, lng: 76.64 },
  { name: "Nagpur", lat: 21.15, lng: 79.09 },
  { name: "Noida", lat: 28.54, lng: 77.39 },
  { name: "Pune", lat: 18.52, lng: 73.86 },
  { name: "Surat", lat: 21.17, lng: 72.83 },
  { name: "Thiruvananthapuram", lat: 8.52, lng: 76.94 },
  { name: "Vadodara", lat: 22.31, lng: 73.18 },
  { name: "Visakhapatnam", lat: 17.69, lng: 83.22 },
] as const;

/** Great-circle distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Nearest launch city to a point, or null when none is within maxKm. */
export function nearestCity(point: { lat: number; lng: number }, maxKm = 75) {
  let best: (typeof CITIES)[number] | null = null;
  let bestKm = Infinity;
  for (const c of CITIES) {
    const d = distanceKm(point, c);
    if (d < bestKm) {
      best = c;
      bestKm = d;
    }
  }
  return best && bestKm <= maxKm ? best : null;
}

export function labelFor<T extends readonly Option[]>(options: T, value: string | null | undefined): string | null {
  return options.find((o) => o.value === value)?.label ?? null;
}
