import { notFound } from "next/navigation";
import { Suspense } from "react";
import { StepScreen } from "@/features/onboarding/step-screen";
import { STEPS, isStepSlug } from "@/features/onboarding/steps";
import { StepSkeleton } from "@/features/onboarding/components/step-skeleton";

export function generateStaticParams() {
  return STEPS.map((s) => ({ step: s.slug }));
}

export default async function OnboardingStepPage({ params }: PageProps<"/onboarding/[step]">) {
  const { step } = await params;
  if (!isStepSlug(step)) notFound();
  return (
    <Suspense fallback={<StepSkeleton />}>
      <StepScreen slug={step} />
    </Suspense>
  );
}
