import "server-only";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { loadCatalogues, loadOnboardingData, loadOwnPhotos, type OnboardingData } from "./data";
import { AboutStep, AffectionStep, BasicsStep, BirthdayStep, InterestsStep, LookingForStep } from "./components/simple-steps";
import { LocationStep } from "./components/location-step";
import { PhotosStep } from "./components/photos-step";
import { PromptsStep } from "./components/prompts-step";
import { ReviewStep, type ReviewSummary } from "./components/review-step";
import { StepShell } from "./components/step-shell";
import { countryName, CUDDLE_STYLES, GENDER_GROUPS, INTENTIONS, LOVE_LANGUAGES, PACES, SHOW_ME, labelFor } from "./options";
import { ageOn } from "./schemas";
import { canVisit, currentStepSlug, stepHref, type StepSlug } from "./steps";

/**
 * Server component for one onboarding step: checks access, loads exactly what the step needs,
 * and renders the presentational step component inside the shared shell.
 */
export async function StepScreen({ slug }: { slug: StepSlug }) {
  const user = await requireUser(stepHref(slug));
  const data = await loadOnboardingData(user.id);

  if (data.profile.status !== "onboarding") redirect("/app");
  if (!canVisit(slug, data.profile.onboardingStep)) redirect(stepHref(currentStepSlug(data.profile.onboardingStep)));

  return <StepShell slug={slug}>{await renderStep(slug, user.id, data)}</StepShell>;
}

async function renderStep(slug: StepSlug, userId: string, d: OnboardingData) {
  switch (slug) {
    case "birthday":
      return <BirthdayStep birthDate={d.privateInfo.birthDate} termsAccepted={d.privateInfo.termsAccepted} today={new Date().toISOString().slice(0, 10)} />;
    case "basics":
      return <BasicsStep displayName={d.profile.displayName} genderGroup={d.profile.genderGroup} genderIdentity={d.profile.genderIdentity} pronouns={d.profile.pronouns} />;
    case "looking-for":
      return <LookingForStep intention={d.profile.intention} showGenders={d.preferences.showGenders} ageMin={d.preferences.ageMin} ageMax={d.preferences.ageMax} />;
    case "location":
      return <LocationStep city={d.profile.city} country={countryName(d.profile.countryCode)} maxDistanceKm={d.preferences.maxDistanceKm} unit={d.preferences.distanceUnit} />;
    case "affection":
      return <AffectionStep {...d.affection} />;
    case "interests": {
      const { interests } = await loadCatalogues();
      return <InterestsStep catalogue={interests} selected={d.interestIds} lifestyle={d.lifestyle} />;
    }
    case "photos":
      return <PhotosStep photos={await loadOwnPhotos(userId)} />;
    case "prompts": {
      const { prompts } = await loadCatalogues();
      return <PromptsStep catalogue={prompts} answers={d.prompts} />;
    }
    case "about":
      return <AboutStep bio={d.profile.bio} jobTitle={d.profile.jobTitle} education={d.profile.education} />;
    case "review": {
      const [{ interests, prompts }, photos] = await Promise.all([loadCatalogues(), loadOwnPhotos(userId)]);
      return <ReviewStep summary={buildSummary(d, interests, prompts)} photos={photos} />;
    }
  }
}

export function buildSummary(
  d: OnboardingData,
  interests: { id: number; label: string }[],
  prompts: { id: number; text: string }[],
): ReviewSummary {
  const a = d.affection;
  return {
    name: d.profile.displayName,
    age: d.privateInfo.birthDate ? ageOn(new Date(`${d.privateInfo.birthDate}T00:00:00Z`), new Date()) : null,
    gender: d.profile.genderIdentity ?? labelFor(GENDER_GROUPS, d.profile.genderGroup),
    pronouns: d.profile.pronouns,
    city: d.profile.city,
    intention: labelFor(INTENTIONS, d.profile.intention),
    showMe: d.preferences.showGenders.map((g) => labelFor(SHOW_ME, g) ?? g),
    ageRange: `Ages ${d.preferences.ageMin}–${d.preferences.ageMax}`,
    distance: `Within ${d.preferences.maxDistanceKm} km`,
    affection: [
      labelFor(CUDDLE_STYLES, a.cuddleStyle),
      labelFor(PACES, a.pace),
      a.touchComfort ? `Touch ${a.touchComfort}/5` : null,
      ...a.loveLanguages.map((l) => labelFor(LOVE_LANGUAGES, l)),
    ].filter((x): x is string => Boolean(x)),
    interests: d.interestIds.map((id) => interests.find((i) => i.id === id)?.label).filter((x): x is string => Boolean(x)),
    prompts: d.prompts
      .map((p) => ({ question: prompts.find((q) => q.id === p.promptId)?.text ?? "", answer: p.answer }))
      .filter((p) => p.question),
    bio: d.profile.bio,
    work: d.profile.jobTitle,
    education: d.profile.education,
  };
}
