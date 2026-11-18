import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { PageHero } from "@/components/site/page-parts";
import { Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Cubdles: who it's for, how matching works, safety, privacy and membership.",
};

const FAQS: { q: string; a: ReactNode }[] = [
  { q: "How do you pronounce Cubdles?", a: "Just like “cuddles”. The b and d in the middle are leaning on each other — that's the joke, and the logo." },
  { q: "Who is Cubdles for?", a: "Adults (18+) looking for a relationship who care about affection and closeness. Every gender and orientation is welcome." },
  { q: "Is this a platonic cuddle service?", a: "No. Cubdles is for dating. Offering or asking for paid cuddling, companionship or anything else sold isn't allowed and leads to removal." },
  { q: "Can anyone message me?", a: "No. Messaging opens only when you've both liked each other. You can unmatch or block at any time." },
  { q: "How do you decide who I see?", a: <>A transparent score built from your intentions, affection profile, shared interests, lifestyle and each other&rsquo;s preferences. No &ldquo;AI matchmaking&rdquo; claims — see <Link className="text-clay underline underline-offset-4" href="/how-it-works">how it works</Link>.</> },
  { q: "What does the verified badge mean?", a: "That a live selfie check matched the person to their photos. We only show it when the check has actually passed." },
  { q: "Will people see where I live?", a: "Never. Others see only a rough distance like “under 5 km”, and we strip location data from your photos." },
  { q: "Is Cubdles free?", a: <>Yes — creating a profile, discovering people, matching and messaging are free. A paid membership adds extras like seeing who liked you. See <Link className="text-clay underline underline-offset-4" href="/pricing">membership</Link>.</> },
  { q: "How do I delete my account?", a: "From Settings → Account → Delete. Your profile disappears straight away and is permanently deleted after 30 days, unless you log back in to change your mind." },
  { q: "Something happened that worried me. What do I do?", a: <>Report the person from their profile or chat, and visit our <Link className="text-clay underline underline-offset-4" href="/safety">Safety centre</Link>. In an emergency in India, call 112.</> },
];

export default function FaqPage() {
  return (
    <>
      <PageHero eyebrow="FAQ" title="Questions, answered" intro="Can't find what you're looking for? Our team is happy to help." />
      <Container>
        <div className="flex max-w-3xl flex-col gap-3">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group rounded-[var(--radius-card)] bg-linen/70 ring-1 ring-oat open:bg-linen">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-[var(--radius-card)] px-6 py-5 text-lg text-cocoa [&::-webkit-details-marker]:hidden">
                <span className="font-medium">{q}</span>
                <ChevronDown className="size-5 shrink-0 text-mocha transition-transform duration-200 group-open:rotate-180" aria-hidden />
              </summary>
              <div className="px-6 pb-6 leading-relaxed text-mocha">{a}</div>
            </details>
          ))}
        </div>
        <p className="mt-10 text-mocha">
          Still wondering? <Link href="/contact" className="text-clay underline underline-offset-4">Contact us</Link>.
        </p>
      </Container>
    </>
  );
}
