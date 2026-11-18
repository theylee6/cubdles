import type { ReactNode } from "react";
import { Container, Eyebrow, Notice } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function PageHero({ eyebrow, title, intro, children }: { eyebrow: string; title: ReactNode; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(ellipse_at_30%_0%,#F6E4DC_0%,transparent_65%)]" />
      <Container className="relative flex flex-col gap-5 pb-12 pt-14 sm:pt-20">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="max-w-3xl text-balance text-4xl leading-[1.1] sm:text-5xl">{title}</h1>
        {intro ? <p className="max-w-2xl text-pretty text-lg leading-relaxed text-mocha">{intro}</p> : null}
        {children}
      </Container>
    </section>
  );
}

/** Long-form text with comfortable measure and spacing. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-w-[68ch] text-[17px] leading-[1.75] text-cocoa",
        "[&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-2xl [&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-xl",
        "[&_p]:mb-4 [&_p]:text-mocha [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-mocha [&_li]:mb-2",
        "[&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:text-mocha",
        "[&_a]:text-clay [&_a]:underline [&_a]:underline-offset-4 [&_strong]:text-cocoa",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Legal pages are drafts until a lawyer reviews them (plan decision D8). */
export function LegalDraftNotice() {
  return (
    <Notice tone="warning" title="Draft — pending legal review" className="max-w-[68ch]">
      This text is a plain-language draft written for review. It is not yet legal advice or a final agreement, and
      will be replaced by the reviewed version before Cubdles launches.
    </Notice>
  );
}
