import type { StepSlug } from "@/features/onboarding/steps";

/** Profile sections a member can edit after onboarding (birthday is fixed; review isn't a section). */
export const EDIT_SECTIONS = [
  { slug: "photos", label: "Photos" },
  { slug: "about", label: "Bio, work and education" },
  { slug: "prompts", label: "Prompts" },
  { slug: "affection", label: "Affection profile" },
  { slug: "interests", label: "Interests and lifestyle" },
  { slug: "basics", label: "Name, gender and pronouns" },
  { slug: "looking-for", label: "Who you'd like to meet" },
  { slug: "location", label: "Location and distance" },
] as const satisfies readonly { slug: StepSlug; label: string }[];

export type EditSection = (typeof EDIT_SECTIONS)[number]["slug"];

export function isEditSection(v: string): v is EditSection {
  return EDIT_SECTIONS.some((s) => s.slug === v);
}
