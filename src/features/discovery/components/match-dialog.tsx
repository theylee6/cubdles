"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BdMark } from "@/components/brand";
import { Button, buttonClasses } from "@/components/ui/button";
import type { ProfileCard } from "../types";

/** The "it's a match" moment. Native <dialog> for focus trapping and Escape handling. */
export function MatchDialog({
  card,
  onClose,
}: {
  card: ProfileCard | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (card && !d.open) d.showModal();
    if (!card && d.open) d.close();
  }, [card]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="match-title"
      className="m-auto w-[min(92vw,420px)] rounded-[var(--radius-sheet)] bg-cream p-0 text-cocoa shadow-[var(--shadow-float)] backdrop:bg-cocoa/40 backdrop:backdrop-blur-sm"
    >
      {card ? (
        <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
          <BdMark className="size-16 motion-safe:animate-[pulse_2s_ease-in-out_1]" />
          <h2 id="match-title" className="text-3xl">
            It&rsquo;s a match
          </h2>
          <p className="text-mocha">
            You and {card.display_name} both said yes. Say hello whenever
            you&rsquo;re ready.
          </p>
          <div className="flex w-full flex-col gap-3">
            <Link
              href={
                card.match_id ? `/app/matches/${card.match_id}` : "/app/matches"
              }
              className={buttonClasses("primary", "lg", "w-full")}
            >
              {card.match_id
                ? `Message ${card.display_name ?? "them"}`
                : "Go to matches"}
            </Link>
            <Button variant="ghost" onClick={onClose}>
              Keep discovering
            </Button>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
