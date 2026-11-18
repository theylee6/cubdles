import { notFound } from "next/navigation";
import { AffectionStep, BasicsStep, BirthdayStep, InterestsStep, LookingForStep } from "@/features/onboarding/components/simple-steps";
import { LocationStep } from "@/features/onboarding/components/location-step";
import { PhotosStep } from "@/features/onboarding/components/photos-step";
import { PromptsStep } from "@/features/onboarding/components/prompts-step";
import { StepShell } from "@/features/onboarding/components/step-shell";
import { Container } from "@/components/ui/primitives";

/**
 * DEVELOPMENT ONLY: renders every onboarding step with sample props, for visual review
 * and as a reference when translating Figma designs. Returns 404 in production builds.
 * Submitting these forms calls the real actions, which require a signed-in user.
 */
export default function OnboardingPreview() {
  if (process.env.NODE_ENV === "production") notFound();

  const interests = ["Slow mornings", "Movie nights", "Baking", "Chai", "Hiking", "Dogs", "Reading", "Live music"].map((label, i) => ({
    id: i + 1,
    label,
    category: "Cozy",
  }));
  const prompts = ["My ideal lazy Sunday looks like", "The way to my heart is", "Big spoon or little spoon, and why"].map((text, i) => ({ id: i + 1, text }));

  return (
    <Container className="flex max-w-2xl flex-col gap-24 py-12">
      <p className="rounded-2xl bg-blush-soft px-4 py-3 text-sm">Development preview — sample data, not saved.</p>
      <section id="birthday"><StepShell slug="birthday"><BirthdayStep birthDate={null} termsAccepted={false} today="2026-11-18" /></StepShell></section>
      <section id="basics"><StepShell slug="basics"><BasicsStep displayName="Meera" genderGroup="woman" genderIdentity={null} pronouns="she/her" /></StepShell></section>
      <section id="looking-for"><StepShell slug="looking-for"><LookingForStep intention="long_term" showGenders={["man"]} ageMin={26} ageMax={36} /></StepShell></section>
      <section id="location"><StepShell slug="location"><LocationStep city="Bengaluru" country="India" maxDistanceKm={25} unit="km" /></StepShell></section>
      <section id="affection"><StepShell slug="affection"><AffectionStep cuddleStyle="little_spoon" pace="slow" touchComfort={4} publicAffection={3} loveLanguages={["touch"]} /></StepShell></section>
      <section id="interests"><StepShell slug="interests"><InterestsStep catalogue={interests} selected={[1, 2, 4]} lifestyle={{}} /></StepShell></section>
      <section id="photos"><StepShell slug="photos"><PhotosStep photos={[]} /></StepShell></section>
      <section id="prompts"><StepShell slug="prompts"><PromptsStep catalogue={prompts} answers={[{ promptId: 1, answer: "Chai, a long book, and someone's shoulder." }]} /></StepShell></section>
    </Container>
  );
}
