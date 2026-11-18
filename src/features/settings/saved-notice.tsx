"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Notice } from "@/components/ui/primitives";

function Inner() {
  const saved = useSearchParams().get("saved");
  return saved ? <Notice title="Saved" className="mb-6">Your changes are live.</Notice> : null;
}

/** Shows a confirmation after an edit redirects back with ?saved=… */
export function SavedNotice() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}
