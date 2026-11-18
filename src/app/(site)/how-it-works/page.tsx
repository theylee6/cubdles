import type { Metadata } from "next";
import { PageHero } from "@/components/site/page-parts";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "How it works",
  description: "From your first profile to your first conversation: how Cubdles helps affectionate people meet, at their own pace.",
};

const STEPS = [
  {
    title: "Create your account",
    body: "Join with email, Google or Apple. We confirm your email and ask for your date of birth — Cubdles is strictly for adults 18 and over.",
  },
  {
    title: "Build your profile, one small step at a time",
    body: "Photos, a short bio, a few prompts, your interests and lifestyle. Then your affection profile: cuddle style, pace, and how you like to be cared for. You can stop and pick up where you left off.",
  },
  {
    title: "Photos are reviewed",
    body: "Every photo is checked before anyone else can see it. That keeps Cubdles free of fakes, explicit images and phone numbers hidden in pictures.",
  },
  {
    title: "Discover people",
    body: "Swipe through one profile at a time, or browse a grid. Filter by age, distance, intentions and more. Each day you also get a few picks, with the reasons you might click shown honestly.",
  },
  {
    title: "Match when it's mutual",
    body: "Like someone and, if they like you back, it's a match. Nobody can message you before that. Passed on someone? They won't keep reappearing.",
  },
  {
    title: "Talk, at your pace",
    body: "Chat privately with text, photos, voice notes and reactions. If anything feels off, unmatch, block or report from the chat in two taps.",
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="How it works"
        title="Unhurried by design"
        intro="Cubdles is built so the most important things — intentions, pace and affection — come up early and kindly, instead of three dates in."
      />
      <Container className="flex flex-col gap-16">
        <ol className="grid gap-5 md:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Card className="flex h-full gap-5">
                <span className="font-display flex size-10 shrink-0 items-center justify-center rounded-full bg-blush-soft text-lg text-clay">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-2">
                  <h2 className="text-xl">{step.title}</h2>
                  <p className="leading-relaxed text-mocha">{step.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ol>

        <section aria-labelledby="matching" className="grid gap-8 rounded-[var(--radius-sheet)] bg-linen p-8 ring-1 ring-oat/70 sm:p-12 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 id="matching" className="text-3xl">
              How we suggest people
            </h2>
            <p className="leading-relaxed text-mocha">
              There&rsquo;s no mysterious AI here. Your suggestions come from a simple, transparent score that we keep
              improving with real feedback:
            </p>
          </div>
          <ul className="flex flex-col gap-3 text-cocoa">
            {[
              "Do your relationship intentions line up?",
              "Do your affection profiles fit — pace, cuddle style, how you show care?",
              "Shared interests and compatible lifestyles",
              "Each other's age and distance preferences",
              "The things you've told us matter most to you",
            ].map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl bg-cream px-4 py-3 ring-1 ring-oat">
                <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-clay" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-3xl">Ready when you are</h2>
          <ButtonLink href="/join" size="lg">
            Join Cubdles
          </ButtonLink>
        </div>
      </Container>
    </>
  );
}
