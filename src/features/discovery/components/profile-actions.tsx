"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Ban, Heart, HeartOff, MessageCircle, Star, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { blockAction, swipeAction, unmatchAction } from "../actions";
import type { ProfileCard } from "../types";
import { ReportButton } from "@/features/safety/components/report-dialog";
import { MatchDialog } from "./match-dialog";

/** Actions on a full profile page: like / pass for new people, unmatch for matches, block for anyone. */
export function ProfileActions({ card }: { card: ProfileCard }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [matchCard, setMatchCard] = useState<ProfileCard | null>(null);

  function swipe(action: "like" | "super" | "pass") {
    start(async () => {
      const r = await swipeAction(card.id, action);
      if (!r.ok) return setMessage(r.message);
      setMessage(null);
      if (r.matched) setMatchCard({ ...card, match_id: r.matchId });
      else
        setDone(
          action === "pass" ? "Okay — we won't show them again." : "Like sent.",
        );
    });
  }

  function unmatch() {
    if (
      !card.match_id ||
      !window.confirm(
        `Unmatch ${card.display_name}? You won't see each other again.`,
      )
    )
      return;
    start(async () => {
      const r = await unmatchAction(card.match_id!);
      if (!r.ok) return setMessage(r.message ?? null);
      router.push("/app/matches");
    });
  }

  function block() {
    if (
      !window.confirm(
        `Block ${card.display_name}? You'll be hidden from each other everywhere on Cubdles.`,
      )
    )
      return;
    start(async () => {
      const r = await blockAction(card.id);
      if (!r.ok) return setMessage(r.message ?? null);
      router.push("/app/discover");
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {message ? (
        <p
          role="alert"
          className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush"
        >
          {message}
        </p>
      ) : null}
      {done ? (
        <p role="status" className="rounded-2xl bg-sage-soft px-4 py-3 text-sm">
          {done}
        </p>
      ) : card.match_id ? (
        <div className="grid grid-cols-2 gap-2">
          <ButtonLink href={`/app/matches/${card.match_id}`}>
            <MessageCircle className="size-4" aria-hidden /> Message
          </ButtonLink>
          <Button variant="secondary" onClick={unmatch} disabled={pending}>
            <HeartOff className="size-4" aria-hidden /> Unmatch
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="secondary"
            onClick={() => swipe("pass")}
            disabled={pending}
          >
            <X className="size-4" aria-hidden /> Pass
          </Button>
          <Button
            variant="secondary"
            onClick={() => swipe("super")}
            disabled={pending}
          >
            <Star className="size-4" aria-hidden /> Super
          </Button>
          <Button onClick={() => swipe("like")} disabled={pending}>
            <Heart className="size-4" aria-hidden /> Like
          </Button>
        </div>
      )}
      <div className="flex items-center justify-center gap-2 text-mocha">
        <Button variant="ghost" size="sm" onClick={block} disabled={pending}>
          <Ban className="size-4" aria-hidden /> Block
        </Button>
        <ReportButton
          reportedId={card.id}
          name={card.display_name ?? "this member"}
          matchId={card.match_id ?? undefined}
          triggerVariant="ghost"
          triggerSize="sm"
        />
      </div>
      <MatchDialog
        card={matchCard}
        onClose={() => {
          setMatchCard(null);
          router.refresh();
        }}
      />
    </div>
  );
}
