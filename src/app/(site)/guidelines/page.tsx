import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, PageHero, Prose } from "@/components/site/page-parts";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: "The few rules that keep Cubdles warm, honest and safe for everyone.",
};

export default function GuidelinesPage() {
  return (
    <>
      <PageHero
        eyebrow="Community guidelines"
        title="Be kind, be real, ask first"
        intro="Cubdles works because people feel safe being open about affection. These guidelines protect that."
      />
      <Container className="flex flex-col gap-8">
        <LegalDraftNotice />
        <Prose>
          <h2>1. Adults only</h2>
          <p>You must be 18 or older. Never include anyone under 18 in your photos or conversations in any sexual or romantic context. We report child-safety concerns to the authorities.</p>

          <h2>2. Be yourself</h2>
          <ul>
            <li>Use your own recent photos and your real first name or a name you go by.</li>
            <li>One account per person. No impersonation, no shared or business accounts.</li>
          </ul>

          <h2>3. Consent, always</h2>
          <ul>
            <li>Affection is opt-in. Respect the pace and boundaries people share, on the app and in person.</li>
            <li>No unsolicited explicit messages or images. No pressure to move off Cubdles or to meet.</li>
            <li>If someone unmatches or blocks you, that&rsquo;s their answer. Don&rsquo;t try to contact them another way.</li>
          </ul>

          <h2>4. Nothing for sale</h2>
          <p>Cubdles is for dating. Offering or asking for paid cuddling, companionship, sexual services or any other paid service is not allowed. Neither is advertising, selling, or asking for money, gifts or financial details.</p>

          <h2>5. No hate, harassment or threats</h2>
          <p>No abuse based on gender, sexuality, caste, religion, ethnicity, disability, body or anything else. No bullying, stalking, threats or sharing someone&rsquo;s private information.</p>

          <h2>6. Keep it legal and safe</h2>
          <p>No illegal activity, violence, weapons, drugs, or content that promotes self-harm. No spam, bots or scraping.</p>

          <h2>What happens if someone breaks these</h2>
          <p>Depending on what happened, we may remove content, warn, suspend or permanently ban an account. You can appeal a decision from your account settings, and a different moderator will review it.</p>
          <p>Seen something that breaks these guidelines? Report it from the profile or chat, or <Link href="/contact">contact us</Link>.</p>
        </Prose>
      </Container>
    </>
  );
}
