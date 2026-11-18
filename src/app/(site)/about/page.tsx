import type { Metadata } from "next";
import { PillowsIllustration } from "@/components/illustrations";
import { PageHero, Prose } from "@/components/site/page-parts";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "About us",
  description: "Why we built Cubdles — and why the b and d are leaning on each other.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="We think affection deserves a place on the profile"
        intro="Cubdles started with a simple observation: for a lot of people, closeness isn't a bonus — it's the point. Yet most apps make it the hardest thing to talk about."
      />
      <Container className="grid gap-12 lg:grid-cols-[1fr_auto]">
        <Prose>
          <h2>The name</h2>
          <p>
            Cubdles is pronounced &ldquo;cuddles&rdquo;. Look closely at the middle: the <strong>b</strong> and the{" "}
            <strong>d</strong> lean in toward each other, like two people curled up on a sofa. The cuddle is built into
            the word.
          </p>
          <h2>What we believe</h2>
          <ul>
            <li>
              <strong>Saying what you want is kind.</strong> Pace, intentions and affection are easier to share early,
              in a gentle format, than to discover late.
            </li>
            <li>
              <strong>Consent isn&rsquo;t a feature, it&rsquo;s the floor.</strong> Messages only after a mutual
              match. Boundaries visible up front. Leaving a conversation is always one tap away.
            </li>
            <li>
              <strong>Trust is earned with honesty.</strong> We never call a profile verified unless a check has really
              passed, and we explain exactly how suggestions are made.
            </li>
            <li>
              <strong>Your data is yours.</strong> We collect only what helps you meet people, never show your exact
              location, and let you download or delete your data yourself.
            </li>
          </ul>
          <h2>What Cubdles is not</h2>
          <p>
            Cubdles is a dating app. It isn&rsquo;t a marketplace for paid cuddling, companionship or anything else
            sold, and it isn&rsquo;t a hookup app. Accounts that use it that way are removed.
          </p>
        </Prose>
        <PillowsIllustration className="mx-auto w-56 self-start lg:mt-12" />
      </Container>
    </>
  );
}
