import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { STEPS, previousStepSlug, stepHref, stepNumber, type StepSlug } from "../steps";

/** Frame around every onboarding step: progress, back link, title. Pure layout — restyle freely. */
export function StepShell({ slug, children }: { slug: StepSlug; children: ReactNode }) {
  const n = stepNumber(slug);
  const step = STEPS[n - 1];
  const prev = previousStepSlug(slug);
  const pct = Math.round((n / STEPS.length) * 100);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm text-mocha">
          {prev ? (
            <Link href={stepHref(prev)} className="inline-flex items-center gap-1.5 rounded-full py-1 pr-2 hover:text-cocoa">
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Link>
          ) : (
            <span />
          )}
          <span>
            Step {n} of {STEPS.length}
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-oat/70"
          role="progressbar"
          aria-label="Profile set-up progress"
          aria-valuenow={n}
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
        >
          <div className="h-full rounded-full bg-clay transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl sm:text-4xl">{step.title}</h1>
        <p className="text-mocha">{step.subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/** Form-level error banner. */
export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-blush-soft px-4 py-3 text-sm text-cocoa ring-1 ring-blush">
      {message}
    </p>
  );
}
