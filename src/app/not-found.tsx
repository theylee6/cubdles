import { PillowsIllustration } from "@/components/illustrations";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main id="main" className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <PillowsIllustration className="w-48" />
      <h1 className="text-4xl">This page has wandered off</h1>
      <p className="max-w-md text-mocha">It may have moved, or the link might be slightly wrong. Let&rsquo;s get you somewhere cozy.</p>
      <ButtonLink href="/">Back to home</ButtonLink>
    </main>
  );
}
