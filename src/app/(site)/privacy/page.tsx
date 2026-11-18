import type { Metadata } from "next";
import Link from "next/link";
import { LegalDraftNotice, PageHero, Prose } from "@/components/site/page-parts";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Cubdles collects, why, who sees it, and how you control it.",
};

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy policy" intro="We collect only what helps you meet people, and we give you real control over it." />
      <Container className="flex flex-col gap-8">
        <LegalDraftNotice />
        <Prose>
          <h2>What we collect</h2>
          <ul>
            <li><strong>Account details:</strong> email, password (stored only as a secure hash by our authentication provider), and phone number if you verify it.</li>
            <li><strong>Profile:</strong> name, photos, date of birth, gender, what you&rsquo;re looking for, interests, lifestyle, prompts and your affection profile. Sensitive details like religion are optional.</li>
            <li><strong>Approximate location and time zone:</strong> location is rounded to about 1 km before we store it and used only to suggest people nearby; your time zone sets when daily limits reset.</li>
            <li><strong>Activity:</strong> likes, passes, matches, messages, reports and blocks — needed to run the service and keep it safe.</li>
            <li><strong>Payments:</strong> handled by our payment provider. We never see or store your full card details.</li>
            <li><strong>Product analytics:</strong> only with your consent, using pseudonymous identifiers.</li>
          </ul>

          <h2>What other members see</h2>
          <p>Your profile, approved photos, age (unless you hide it) and a rough distance. Never your email, phone, exact location or date of birth.</p>

          <h2>Why we use it</h2>
          <p>To show you to people and people to you, to deliver messages, to keep Cubdles safe (including reviewing reports and detecting fake accounts), to process payments, and — with your consent — to improve the product.</p>

          <h2>Who we share it with</h2>
          <p>Service providers that help us run Cubdles (hosting, database, email, SMS, payments, photo safety checks, identity verification), each under a contract that limits how they use your data. We may share information with authorities where the law requires it or to protect someone&rsquo;s safety. We don&rsquo;t sell your personal data.</p>

          <h2>International transfers</h2>
          <p>Cubdles is used worldwide and our servers are in Japan. When your data moves between countries, we use legal safeguards such as standard contractual clauses.</p>

          <h2>How long we keep it</h2>
          <p>While your account is open. When you delete your account, your profile is hidden at once and permanently deleted after 30 days. Some records are kept longer where the law requires (such as payment records) or for safety (such as the reason an account was banned).</p>

          <h2>Your choices and rights</h2>
          <ul>
            <li>Edit or hide parts of your profile, turn off online status and read receipts, and pause your account.</li>
            <li>Download a copy of your data, correct it, or delete your account from Settings.</li>
            <li>Withdraw consent for optional processing (like analytics or marketing emails) at any time.</li>
            <li>Raise a complaint with us, and if you&rsquo;re not satisfied, with your local data protection authority (for example in the EU, the UK, India, or your US state).</li>
          </ul>
          <p>Questions? <Link href="/contact">Contact us</Link> and choose &ldquo;Privacy&rdquo;.</p>
        </Prose>
      </Container>
    </>
  );
}
