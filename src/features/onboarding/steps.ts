/**
 * The onboarding step registry — the single source of truth for order, routes and copy.
 * profiles.onboarding_step stores how many steps are complete (0..STEPS.length).
 */
export const STEPS = [
  { slug: "birthday", title: "When's your birthday?", subtitle: "Cubdles is for adults 18 and over. Only your age is ever shown." },
  { slug: "basics", title: "A little about you", subtitle: "How you'd like to be introduced." },
  { slug: "looking-for", title: "Who would you like to meet?", subtitle: "You can change this any time." },
  { slug: "location", title: "Where are you?", subtitle: "We only ever show a rough distance — never your exact location." },
  { slug: "affection", title: "Your affection profile", subtitle: "A few gentle questions about how you like to be close." },
  { slug: "interests", title: "Things you love", subtitle: "Pick at least 3. Lifestyle details are optional." },
  { slug: "photos", title: "Add your photos", subtitle: "At least 2, up to 6. Each one is reviewed before others can see it." },
  { slug: "prompts", title: "Let your personality show", subtitle: "Answer at least one prompt — up to three." },
  { slug: "about", title: "In your own words", subtitle: "A short bio and, if you like, what you do." },
  { slug: "review", title: "Looking lovely", subtitle: "Check everything over, then you're ready." },
] as const;

export type StepSlug = (typeof STEPS)[number]["slug"];

export const STEP_SLUGS = STEPS.map((s) => s.slug) as StepSlug[];

export function isStepSlug(value: string): value is StepSlug {
  return (STEP_SLUGS as string[]).includes(value);
}

/** 1-based position of a step. */
export function stepNumber(slug: StepSlug): number {
  return STEP_SLUGS.indexOf(slug) + 1;
}

/** The step a member should be on, given how many they've completed. */
export function currentStepSlug(completed: number): StepSlug {
  const i = Math.min(Math.max(completed, 0), STEPS.length - 1);
  return STEP_SLUGS[i];
}

/** Members may revisit any completed step and the current one, but can't skip ahead. */
export function canVisit(slug: StepSlug, completed: number): boolean {
  return stepNumber(slug) <= Math.min(completed + 1, STEPS.length);
}

export function nextStepSlug(slug: StepSlug): StepSlug | null {
  const i = STEP_SLUGS.indexOf(slug);
  return i < STEPS.length - 1 ? STEP_SLUGS[i + 1] : null;
}

export function previousStepSlug(slug: StepSlug): StepSlug | null {
  const i = STEP_SLUGS.indexOf(slug);
  return i > 0 ? STEP_SLUGS[i - 1] : null;
}

export function stepHref(slug: StepSlug): `/onboarding/${StepSlug}` {
  return `/onboarding/${slug}`;
}
