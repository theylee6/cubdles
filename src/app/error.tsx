"use client";

import { useEffect } from "react";
import { MugIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Sentry hook-up comes in M8; for now, surface it in the console.
    console.error(error);
  }, [error]);

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
