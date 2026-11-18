"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, MapPin, Sparkles } from "lucide-react";
import { AffectionBadge, Chip } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  cuddleStyleText,
  distanceText,
  intentionText,
  lifestyleText,
  loveLanguageText,
  paceText,
  reasonText,
} from "../copy";
import type { ProfileCard } from "../types";

/**
 * Presentational profile: photo carousel, basics, why-you-might-click, prompts, affection, interests.
 * `compact` shows just the first screen (for the swipe deck); full shows everything (profile page).
 */
export function ProfileView({ card, compact = false, className }: { card: ProfileCard; compact?: boolean; className?: string }) {
  const reasons = (card.compatibility?.reasons ?? []).map(reasonText).filter((x): x is string => Boolean(x));
  const a = card.affection;
  const affectionBadges = [
    cuddleStyleText(a?.cuddle_style),
    paceText(a?.pace),
    a?.touch_comfort ? `Cuddle love ${a.touch_comfort}/5` : null,
    ...(a?.love_languages ?? []).map(loveLanguageText),
  ].filter((x): x is string => Boolean(x));
  const meta = [distanceText(card.distance), card.city, card.last_active_label].filter(Boolean);

  return (
    <article className={cn("overflow-hidden rounded-[var(--radius-sheet)] bg-cream ring-1 ring-oat shadow-[var(--shadow-card)]", className)}>
      <PhotoCarousel card={card} />
      <div className="flex flex-col gap-5 p-5 sm:p-6">
        <header className="flex flex-col gap-1">
          <h2 className="text-3xl">
            {card.display_name}
            {card.age ? <span className="text-mocha">, {card.age}</span> : null}
          </h2>
          <p className="text-sm text-mocha">{[card.gender, card.pronouns].filter(Boolean).join(" · ")}</p>
          {meta.length ? (
            <p className="flex items-center gap-1.5 text-sm text-mocha">
              <MapPin className="size-4" aria-hidden /> {meta.join(" · ")}
            </p>
          ) : null}
        </header>

        {reasons.length ? (
          <section aria-label="Why you might click" className="rounded-2xl bg-blush-soft px-4 py-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-clay-deep">
              <Sparkles className="size-3.5" aria-hidden /> Why you might click
            </p>
            <ul className="flex flex-col gap-0.5 text-sm text-cocoa">
              {reasons.slice(0, compact ? 2 : 6).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {affectionBadges.length ? (
          <div className="flex flex-wrap gap-2" aria-label="Affection profile">
            {affectionBadges.map((b) => (
              <AffectionBadge key={b}>{b}</AffectionBadge>
            ))}
          </div>
        ) : null}

        {card.prompts[0] ? <Prompt q={card.prompts[0].question} a={card.prompts[0].answer} /> : null}

        {!compact ? (
          <>
            {card.bio ? <p className="whitespace-pre-line leading-relaxed text-cocoa">{card.bio}</p> : null}
            {intentionText(card.intention) ? (
              <p className="text-sm">
                <span className="text-mocha">Looking for </span>
                {intentionText(card.intention)?.toLowerCase()}
              </p>
            ) : null}
            {card.prompts.slice(1).map((p) => (
              <Prompt key={p.question} q={p.question} a={p.answer} />
            ))}
            {card.interests.length ? (
              <div className="flex flex-wrap gap-2" aria-label="Interests">
                {card.interests.map((i) => (
                  <Chip key={i}>{i}</Chip>
                ))}
              </div>
            ) : null}
            <Facts card={card} />
          </>
        ) : null}
      </div>
    </article>
  );
}

function Prompt({ q, a }: { q: string; a: string }) {
  return (
    <section className="rounded-2xl bg-linen px-4 py-3 ring-1 ring-oat/70">
      <p className="text-sm text-mocha">{q}</p>
      <p className="font-display text-xl leading-snug">{a}</p>
    </section>
  );
}

function Facts({ card }: { card: ProfileCard }) {
  const facts = [
    card.job_title,
    card.education,
    ...Object.entries(card.lifestyle ?? {}).map(([k, v]) => lifestyleText(k, v)),
  ].filter((x): x is string => Boolean(x));
  if (!facts.length) return null;
  return (
    <ul className="flex flex-col gap-1 text-sm text-mocha" aria-label="About">
      {facts.map((f) => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  );
}

function PhotoCarousel({ card }: { card: ProfileCard }) {
  const photos = card.photos.filter((p) => p.url);
  const [i, setI] = useState(0);
  if (!photos.length) {
    return <div className="flex aspect-[4/5] items-center justify-center bg-linen text-mocha">No photos yet</div>;
  }
  const photo = photos[Math.min(i, photos.length - 1)];
  return (
    <div className="relative aspect-[4/5] bg-linen">
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URLs from private storage */}
      <img src={photo.url!} alt={`${card.display_name ?? "Profile"} — photo ${i + 1} of ${photos.length}`} className="size-full object-cover" />
      {photos.length > 1 ? (
        <>
          <div className="absolute inset-x-3 top-3 flex gap-1" aria-hidden>
            {photos.map((p, j) => (
              <span key={p.id} className={cn("h-1 flex-1 rounded-full", j === i ? "bg-cream" : "bg-cream/45")} />
            ))}
          </div>
          <button type="button" onClick={() => setI((i - 1 + photos.length) % photos.length)} aria-label="Previous photo" className="absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-2 text-cream/0 hover:text-cream focus-visible:text-cream">
            <ChevronLeft className="size-8 drop-shadow" />
          </button>
          <button type="button" onClick={() => setI((i + 1) % photos.length)} aria-label="Next photo" className="absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-2 text-cream/0 hover:text-cream focus-visible:text-cream">
            <ChevronRight className="size-8 drop-shadow" />
          </button>
        </>
      ) : null}
    </div>
  );
}
