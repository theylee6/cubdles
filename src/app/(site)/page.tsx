import { HeartHandshake, MessageCircleHeart, ShieldCheck, Sparkles } from "lucide-react";
import { BdMark } from "@/components/brand";
import { MugIllustration, PillowsIllustration, ShieldIllustration, SofaScene } from "@/components/illustrations";
import { ButtonLink } from "@/components/ui/button";
import { AffectionBadge, Card, Chip, Container, Eyebrow, SectionHeading } from "@/components/ui/primitives";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(ellipse_at_70%_20%,#F6E4DC_0%,transparent_60%)]" />
        <Container className="relative grid items-center gap-12 pb-20 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr]">
          <div className="flex flex-col gap-7">
            <Eyebrow>Dating, but cozier</Eyebrow>
            <h1 className="text-balance text-[2.6rem] leading-[1.05] text-cocoa sm:text-6xl">
              For people who&rsquo;d rather be held than swiped&nbsp;past.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-mocha">
              Cubdles (said &ldquo;cuddles&rdquo;) matches you on how you like to be close: slow mornings, sofa
              nights, hand-holding, the pace that feels right. Say it early and kindly, and meet people who feel the
              same.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/join" size="lg">
                Join Cubdles
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary" size="lg">
                How it works
              </ButtonLink>
            </div>
            <p className="text-sm text-mocha">Free to join. Adults 18+ only. Messaging opens only after you both say yes.</p>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <SofaScene className="w-full" label="Two people sharing a blanket on a sofa" />
            <figure
              aria-label="Example of a Cubdles profile card"
              className="absolute -bottom-10 -left-2 w-60 rounded-[var(--radius-card)] bg-cream p-4 shadow-[var(--shadow-float)] ring-1 ring-oat sm:left-6"
            >
              <figcaption className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-mocha">Example profile</figcaption>
              <p className="font-display text-xl text-cocoa">Meera, 29</p>
              <p className="mt-1 text-sm text-mocha">&ldquo;My ideal lazy Sunday: chai, a long book, someone&rsquo;s shoulder.&rdquo;</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <AffectionBadge>Little spoon</AffectionBadge>
                <AffectionBadge>Slow & steady</AffectionBadge>
              </div>
            </figure>
          </div>
        </Container>
      </section>

      {/* What makes it different */}
      <section aria-labelledby="different" className="py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Why Cubdles"
            title={<span id="different">Closeness, said out loud — gently</span>}
            intro="Most apps leave the most important part for the third date. We put it on the profile, in a way that feels warm rather than awkward."
          />
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="flex flex-col gap-4">
              <HeartHandshake className="size-7 text-clay" strokeWidth={1.5} aria-hidden />
              <h3 className="text-xl">An affection profile</h3>
              <p className="leading-relaxed text-mocha">
                A few playful questions — big spoon or little, how quickly you warm up, how you show you care — that
                shape who you see first.
              </p>
            </Card>
            <Card className="flex flex-col gap-4">
              <MessageCircleHeart className="size-7 text-clay" strokeWidth={1.5} aria-hidden />
              <h3 className="text-xl">Consent comes first</h3>
              <p className="leading-relaxed text-mocha">
                Pace and boundaries are visible before you match. Nobody can message you until you&rsquo;ve both said
                yes, and you can unmatch or block in two taps.
              </p>
            </Card>
            <Card className="flex flex-col gap-4">
              <ShieldCheck className="size-7 text-clay" strokeWidth={1.5} aria-hidden />
              <h3 className="text-xl">Real people, checked</h3>
              <p className="leading-relaxed text-mocha">
                Every account is 18+, every photo is reviewed, and a verified badge appears only when a live selfie
                check has actually passed.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Affection profile showcase */}
      <section aria-labelledby="affection" className="py-20">
        <Container>
          <div className="grid items-center gap-12 rounded-[var(--radius-sheet)] bg-linen px-6 py-12 ring-1 ring-oat/70 sm:px-12 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <Eyebrow>Your affection profile</Eyebrow>
              <h2 id="affection" className="text-balance text-3xl sm:text-4xl">
                Small answers that say a lot
              </h2>
              <p className="text-lg leading-relaxed text-mocha">
                Takes about two minutes. Change it any time. Nothing here is ever shown as a number — just soft badges
                that start better conversations.
              </p>
              <dl className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                  <dt className="text-sm font-medium text-cocoa">Cuddle style</dt>
                  <dd className="flex flex-wrap gap-2">
                    <Chip>Big spoon</Chip>
                    <Chip selected>Little spoon</Chip>
                    <Chip>Either, happily</Chip>
                  </dd>
                </div>
                <div className="flex flex-col gap-2">
                  <dt className="text-sm font-medium text-cocoa">Pace</dt>
                  <dd className="flex flex-wrap gap-2">
                    <Chip selected>Slow & steady</Chip>
                    <Chip>Somewhere in between</Chip>
                    <Chip>I warm up fast</Chip>
                  </dd>
                </div>
                <div className="flex flex-col gap-2">
                  <dt className="text-sm font-medium text-cocoa">I feel most cared for through</dt>
                  <dd className="flex flex-wrap gap-2">
                    <Chip selected>Quality time</Chip>
                    <Chip selected>Touch</Chip>
                    <Chip>Kind words</Chip>
                    <Chip>Little acts</Chip>
                  </dd>
                </div>
              </dl>
            </div>
            <div className="flex items-center justify-center gap-6">
              <PillowsIllustration className="w-48 sm:w-64" />
              <MugIllustration className="hidden w-28 sm:block" />
            </div>
          </div>
        </Container>
      </section>

      {/* Steps */}
      <section aria-labelledby="steps" className="py-20">
        <Container className="flex flex-col gap-12">
          <SectionHeading eyebrow="How it works" title={<span id="steps">Three unhurried steps</span>} align="center" />
          <ol className="grid gap-5 md:grid-cols-3">
            {[
              { n: "1", t: "Make a profile that sounds like you", d: "Photos, a few prompts, and your affection profile. Save and finish later whenever you like." },
              { n: "2", t: "Meet people who fit", d: "Swipe or browse. Your daily picks show why you might click — shared interests, intentions, and pace." },
              { n: "3", t: "Talk when you both say yes", d: "A match opens a private chat. Share photos and voice notes, and take it at your pace." },
            ].map((s) => (
              <li key={s.n} className="flex flex-col gap-3 rounded-[var(--radius-card)] bg-cream p-6 ring-1 ring-oat">
                <span className="font-display flex size-10 items-center justify-center rounded-full bg-blush-soft text-lg text-clay">{s.n}</span>
                <h3 className="text-xl">{s.t}</h3>
                <p className="leading-relaxed text-mocha">{s.d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Safety band */}
      <section aria-labelledby="safety" className="py-20">
        <Container className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <ShieldIllustration className="mx-auto w-36" />
          <div className="flex flex-col gap-4">
            <h2 id="safety" className="text-3xl">
              Warm doesn&rsquo;t mean careless
            </h2>
            <p className="max-w-2xl text-lg leading-relaxed text-mocha">
              Cubdles is for dating — never for paid &ldquo;cuddle sessions&rdquo; or anything sold. Our moderators
              review reports, and you control who sees you, what they see, and when.
            </p>
            <div>
              <ButtonLink href="/safety" variant="secondary">
                Visit the Safety centre
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      {/* Final CTA */}
      <section className="pb-8 pt-12">
        <Container>
          <div className="flex flex-col items-center gap-6 rounded-[var(--radius-sheet)] bg-[linear-gradient(180deg,#F6E4DC,#FBF7F2)] px-6 py-16 text-center ring-1 ring-blush/60">
            <BdMark className="size-14" />
            <h2 className="text-balance text-3xl sm:text-4xl">Someone out there is also a little spoon.</h2>
            <p className="max-w-lg text-lg text-mocha">Join free, take your time, and see who feels like home.</p>
            <ButtonLink href="/join" size="lg">
              <Sparkles className="size-4" aria-hidden /> Join Cubdles
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
