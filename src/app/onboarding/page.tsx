import { redirect } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { StepSkeleton } from "@/features/onboarding/components/step-skeleton";
import { currentStepSlug, stepHref } from "@/features/onboarding/steps";

/** /onboarding → resumes at the first unfinished step. */
export default function OnboardingIndex() {
  return (
    <Suspense fallback={<StepSkeleton />}>
      <Resume />
    </Suspense>
  );
}

async function Resume(): Promise<never> {
  const user = await requireUser("/onboarding");
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("status, onboarding_step").eq("id", user.id).single();
  if (!data || data.status !== "onboarding") redirect("/app");
  redirect(stepHref(currentStepSlug(data.onboarding_step)));
}
