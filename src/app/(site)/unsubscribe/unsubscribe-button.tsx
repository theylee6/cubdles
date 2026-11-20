"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

/** Unsubscribing happens on click (POST), never on page load, so link scanners can't trigger it. */
export function UnsubscribeButton({
  query,
  label,
}: {
  query: string;
  label: string;
}) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  const [pending, start] = useTransition();
  if (state === "done")
    return (
      <p role="status">
        Done. You won&rsquo;t get these emails any more. You can turn them back
        on in Settings.
      </p>
    );
  return (
    <div className="flex flex-col gap-3">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await fetch(`/api/unsubscribe?${query}`, {
              method: "POST",
            }).catch(() => null);
            setState(r?.ok ? "done" : "error");
          })
        }
      >
        {pending ? "Saving…" : label}
      </Button>
      {state === "error" ? (
        <p role="alert">
          That link didn&rsquo;t work. You can change emails in Settings once
          you log in.
        </p>
      ) : null}
    </div>
  );
}
