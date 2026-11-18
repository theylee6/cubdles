"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Pencil } from "lucide-react";
import { AffectionBadge, Chip } from "@/components/ui/primitives";
import { useActionForm } from "@/components/ui/use-action-form";
import { finishOnboarding, type FinishState } from "../actions";
import type { OwnPhoto } from "../data";
import { stepHref, type StepSlug } from "../steps";
import { Continue } from "./simple-steps";

export type ReviewSummary = {
  name: string | null;
  age: number | null;
  gender: string | null;
  pronouns: string | null;
  city: string | null;
  intention: string | null;
  showMe: string[];
  ageRange: string;
  distance: string;
  affection: string[];
  interests: string[];
  prompts: { question: string; answer: string }[];
  bio: string | null;
  work: string | null;
  education: string | null;
};

export function ReviewStep({ summary, photos }: { summary: ReviewSummary; photos: OwnPhoto[] }) {
  const { state, pending, formProps } = useActionForm<FinishState>(finishOnboarding);

  return (
    <div className="flex flex-col gap-6">
      <Section title="Photos" step="photos">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((p, i) =>
            p.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.url} alt={`Photo ${i + 1}`} className="aspect-[4/5] w-full rounded-xl object-cover" />
            ) : null,
          )}
        </div>
        <p className="mt-2 text-sm text-mocha">Photos marked &ldquo;In review&rdquo; become visible to others once approved.</p>
      </Section>

      <Section title="About you" step="basics">
        <p className="font-display text-2xl">
          {summary.name}
          {summary.age ? `, ${summary.age}` : ""}
        </p>
        <p className="text-mocha">{[summary.gender, summary.pronouns, summary.city].filter(Boolean).join(" · ")}</p>
      </Section>

      <Section title="Looking for" step="looking-for">
        <p>{summary.intention}</p>
        <p className="text-mocha">
          {summary.showMe.join(", ")} · {summary.ageRange} · {summary.distance}
        </p>
      </Section>

      <Section title="Affection profile" step="affection">
        <div className="flex flex-wrap gap-2">
          {summary.affection.map((a) => (
            <AffectionBadge key={a}>{a}</AffectionBadge>
          ))}
        </div>
      </Section>

      <Section title="Interests" step="interests">
        <div className="flex flex-wrap gap-2">
          {summary.interests.map((i) => (
            <Chip key={i}>{i}</Chip>
          ))}
        </div>
      </Section>

      <Section title="Prompts" step="prompts">
        <div className="flex flex-col gap-3">
          {summary.prompts.map((p) => (
            <div key={p.question}>
              <p className="text-sm text-mocha">{p.question}</p>
              <p>{p.answer}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Bio" step="about">
        <p className="whitespace-pre-line">{summary.bio}</p>
        {summary.work || summary.education ? (
          <p className="mt-2 text-mocha">{[summary.work, summary.education].filter(Boolean).join(" · ")}</p>
        ) : null}
      </Section>

      <form {...formProps} className="flex flex-col gap-3">
        {state.message ? (
          <p role="alert" className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush">
            {state.message}{" "}
            {state.fixStep ? (
              <Link href={stepHref(state.fixStep as StepSlug)} className="text-clay underline underline-offset-4">
                Fix this
              </Link>
            ) : null}
          </p>
        ) : null}
        <div>
          <Continue pending={pending} label="Finish and start meeting people" />
        </div>
      </form>
    </div>
  );
}

function Section({ title, step, children }: { title: string; step: StepSlug; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-card)] bg-linen/70 p-5 ring-1 ring-oat">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg">{title}</h2>
        <Link href={stepHref(step)} className="inline-flex items-center gap-1.5 text-sm text-clay hover:underline">
          <Pencil className="size-3.5" aria-hidden /> Edit<span className="sr-only"> {title}</span>
        </Link>
      </div>
      {children}
    </section>
  );
}
