import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Ban, Flag, Lock, MapPinOff, UserCheck } from "lucide-react";
import { PageHero, Prose } from "@/components/site/page-parts";
import { Card, Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Safety centre",
  description: "How Cubdles keeps dating warm and safe: 18+ only, reviewed photos, mutual-match messaging, blocking, reporting and privacy controls.",
};

const PROTECTIONS = [
  { icon: UserCheck, title: "Adults only", body: "Everyone confirms their date of birth. Anyone under 18 is turned away and can't simply try again." },
  { icon: BadgeCheck, title: "Badges that mean something", body: "A verified badge appears only after a live selfie check passes. We never show it for anything less." },
  { icon: Lock, title: "Messages after a match", body: "Nobody can message you unless you've both liked each other. Unmatch and the conversation closes for both of you." },
  { icon: Ban, title: "Block in two taps", body: "Blocking hides you from each other everywhere on Cubdles — in discovery, likes and chats." },
  { icon: Flag, title: "Report anything", body: "Report a profile, photo or message. Our moderators review every report, and the person isn't told who reported them." },
  { icon: MapPinOff, title: "No exact location", body: "We only ever show rough distance, like “under 5 km”. Your precise location is never shared, and photo location data is removed." },
];

export default function SafetyPage() {
  return (
    <>
      <PageHero
        eyebrow="Safety centre"
        title="Warm doesn't mean careless"
        intro="Here's how Cubdles protects you, and some simple habits that make meeting someone new safer."
      />
      <Container className="flex flex-col gap-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROTECTIONS.map(({ icon: Icon, title, body }) => (
            <Card key={title} className="flex flex-col gap-3">
              <Icon className="size-6 text-clay" strokeWidth={1.5} aria-hidden />
              <h2 className="text-lg">{title}</h2>
              <p className="leading-relaxed text-mocha">{body}</p>
            </Card>
          ))}
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          <Prose>
            <h2>Before you meet</h2>
            <ul>
              <li>Keep chatting on Cubdles until you feel sure. You can always report what happens here.</li>
              <li>A short video call is a good way to check someone is who they say they are.</li>
              <li>Never send money, gift cards or crypto to someone you haven&rsquo;t met — no matter the story.</li>
              <li>Be wary of anyone who offers &ldquo;cuddle sessions&rdquo; or anything for payment. That isn&rsquo;t allowed here; please report it.</li>
            </ul>
          </Prose>
          <Prose>
            <h2>When you meet</h2>
            <ul>
              <li>Meet somewhere public the first few times, and get there and home on your own.</li>
              <li>Tell a friend where you&rsquo;re going and who you&rsquo;re meeting.</li>
              <li>Affection is always opt-in. Ask, listen, and it&rsquo;s fine to change your mind at any moment.</li>
              <li>If you feel unsafe, leave. In an emergency, call your local emergency number (for example 911 in the US and Canada, 999 in the UK, 112 across Europe and India, 000 in Australia).</li>
            </ul>
          </Prose>
        </div>

        <Prose>
          <h2 id="background-checks">Important: no criminal background checks</h2>
          <p>
            <strong>Cubdles does not conduct criminal background checks or identity checks on every member.</strong> A
            verified badge means a live selfie matched the person&rsquo;s photos — nothing more. Please take the same care
            you would with anyone you meet for the first time.
          </p>
          <h2>If something goes wrong</h2>
          <p>
            Report the person from their profile or your chat — it&rsquo;s confidential. For anything urgent or that
            happened off the app, <Link href="/contact">contact our safety team</Link>. Please read our{" "}
            <Link href="/guidelines">community guidelines</Link> to see what&rsquo;s not allowed.
          </p>
        </Prose>
      </Container>
    </>
  );
}
