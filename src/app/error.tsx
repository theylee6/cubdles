"use client";

import { useEffect } from "react";
import { MugIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";

/** A page left open across a deploy asks for files or actions that no longer exist: a reload fixes it. */
function isStaleVersion(error: Error): boolean {
  return (
    error.name === "ChunkLoadError" ||
    /loading (css )?chunk|failed to load chunk|failed to fetch dynamically imported module/i.test(error.message) ||
    (/server action/i.test(error.message) && /not found/i.test(error.message))
  );
}

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const stale = isStaleVersion(error);

  useEffect(() => {
    // Sentry hook-up comes in M8; for now, surface it in the console.
    console.error(error);
  }, [error]);

  if (stale) {
    return (
      <main id="main" className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
        <MugIllustration className="w-32" />
        <h1 className="text-3xl">Fresh pot brewed</h1>
        <p className="max-w-md text-mocha">Cubdles was just updated. Reload the page to carry on where you were.</p>
        <Button onClick={() => window.location.reload()}>Reload</Button>
      </main>
    );
  }

  return (
    <main id="main" className="flex min-h-[70dvh] flex-col items-center justify-center gap-6 px-6 text-center">
      <MugIllustration className="w-32" />
      <h1 className="text-3xl">Something spilled</h1>
      <p className="max-w-md text-mocha">
        We hit an unexpected problem. Please try again{error.digest ? ` (reference ${error.digest})` : ""}.
      </p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
