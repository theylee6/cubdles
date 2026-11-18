import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { loadCatalogues, loadOnboardingData, loadOwnPhotos } from "@/features/onboarding/data";
import { AboutStep, AffectionStep, BasicsStep, InterestsStep, LookingForStep } from "@/features/onboarding/components/simple-steps";
import { LocationStep } from "@/features/onboarding/components/location-step";
import { PromptsStep } from "@/features/onboarding/components/prompts-step";
import { StepModeProvider } from "@/features/onboarding/components/step-mode";
import { countryName } from "@/features/onboarding/options";
import { STEPS } from "@/features/onboarding/steps";
import { PageSkeleton } from "@/features/member/page-header";
import { PhotoManager } from "@/features/photos/photo-manager";
import { EDIT_SECTIONS, isEditSection, type EditSection } from "@/features/settings/sections";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Edit profile" };

export function generateStaticParams() {
  return EDIT_SECTIONS.map((s) => ({ section: s.slug }));
}

export default async function EditSectionPage({ params }: PageProps<"/app/me/edit/[section]">) {
  const { section } = await params;
  if (!isEditSection(section)) notFound();
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Edit section={section} />
    </Suspense>
  );
}

async function Edit({ section }: { section: EditSection }) {
  const me = await requireActiveMember(`/app/me/edit/${section}`);
  const step = STEPS.find((s) => s.slug === section)!;
  const d = await loadOnboardingData(me.id);

  let body: React.ReactNode;
  switch (section) {
    case "basics":
      body = <BasicsStep displayName={d.profile.displayName} genderGroup={d.profile.genderGroup} genderIdentity={d.profile.genderIdentity} pronouns={d.profile.pronouns} />;
      break;
    case "looking-for":
      body = <LookingForStep intention={d.profile.intention} showGenders={d.preferences.showGenders} ageMin={d.preferences.ageMin} ageMax={d.preferences.ageMax} />;
      break;
    case "location":
      body = <LocationStep city={d.profile.city} country={countryName(d.profile.countryCode)} maxDistanceKm={d.preferences.maxDistanceKm} unit={d.preferences.distanceUnit} />;
      break;
    case "affection":
      body = <AffectionStep {...d.affection} />;
      break;
    case "interests":
      body = <InterestsStep catalogue={(await loadCatalogues()).interests} selected={d.interestIds} lifestyle={d.lifestyle} />;
      break;
    case "prompts":
      body = <PromptsStep catalogue={(await loadCatalogues()).prompts} answers={d.prompts} />;
      break;
    case "about":
      body = <AboutStep bio={d.profile.bio} jobTitle={d.profile.jobTitle} education={d.profile.education} />;
      break;
    case "photos":
      body = (
        <>
          <PhotoManager initialPhotos={await loadOwnPhotos(me.id)} />
          <p className="text-sm text-mocha">Changes to photos save straight away. Keep at least 2 so people can get a feel for you.</p>
        </>
      );
      break;
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link href="/app/me" className="inline-flex w-fit items-center gap-1.5 text-sm text-mocha hover:text-cocoa">
        <ArrowLeft className="size-4" aria-hidden /> Back to profile
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl">{EDIT_SECTIONS.find((s) => s.slug === section)!.label}</h1>
        <p className="text-mocha">{step.subtitle}</p>
      </div>
      <StepModeProvider mode="edit">{body}</StepModeProvider>
    </div>
  );
}
