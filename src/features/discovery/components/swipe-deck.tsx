"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Heart, Star, X } from "lucide-react";
import { PillowsIllustration } from "@/components/illustrations";
import { buttonClasses } from "@/components/ui/button";
import { loadDiscoverPage, swipeAction } from "../actions";
import type { ProfileCard, SwipeAction } from "../types";
import { MatchDialog } from "./match-dialog";
import { ProfileView } from "./profile-view";

const SWIPE_THRESHOLD = 120;

/**
 * One-at-a-time discovery. Buttons, keyboard (← pass, → like, ↑ super) and drag all
 * call the same server action; the deck pre-fetches the next page when it runs low.
 */
export function SwipeDeck({ initial, initialOffset }: { initial: ProfileCard[]; initialOffset: number | null }) {
  const [queue, setQueue] = useState(initial);
  const [nextOffset, setNextOffset] = useState(initialOffset);
  const [message, setMessage] = useState<string | null>(null);
  const [matchCard, setMatchCard] = useState<ProfileCard | null>(null);
  const [busy, startTransition] = useTransition();
  const loading = useRef(false);
  const current = queue[0];

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-8, 8]);
  const likeOpacity = useTransform(x, [40, SWIPE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-SWIPE_THRESHOLD, -40], [1, 0]);

  // Keep the queue topped up. Offsets shift as people are liked/passed, so always ask from 0
  // and drop anyone already in the queue.
  useEffect(() => {
    if (queue.length > 3 || nextOffset === null || loading.current) return;
    loading.current = true;
    loadDiscoverPage({}, 0)
      .then((page) => {
        setQueue((q) => [...q, ...page.cards.filter((c) => !q.some((x) => x.id === c.id))]);
        setNextOffset(page.cards.length ? page.nextOffset : null);
      })
      .finally(() => {
        loading.current = false;
      });
  }, [queue.length, nextOffset]);

  const act = useCallback(
    (action: SwipeAction) => {
      if (!current || busy) return;
      const card = current;
      const dir = action === "pass" ? -1 : 1;
      animate(x, dir * 600, { duration: 0.25 }).then(() => {
        setQueue((q) => q.slice(1));
        x.set(0);
      });
      startTransition(async () => {
        const res = await swipeAction(card.id, action);
        if (!res.ok) {
          setMessage(res.message);
          // Put the card back if the action was refused (e.g. daily limit), unless they're gone.
          if (res.code !== "target_unavailable") setQueue((q) => [card, ...q.filter((c) => c.id !== card.id)]);
          return;
        }
        setMessage(null);
        if (res.matched) setMatchCard(card);
      });
    },
    [current, busy, x],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (matchCard || (e.target as HTMLElement)?.closest("input, textarea, select, button, a")) return;
      if (e.key === "ArrowLeft") act("pass");
      if (e.key === "ArrowRight") act("like");
      if (e.key === "ArrowUp") act("super");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [act, matchCard]);

  if (!current) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-[var(--radius-sheet)] bg-linen px-6 py-14 text-center ring-1 ring-oat">
        <PillowsIllustration className="w-40" />
        <h2 className="text-2xl">That&rsquo;s everyone for now</h2>
        <p className="max-w-sm text-mocha">
          New people join every day. You could widen your distance or age range to see more.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/app/me/edit/looking-for" className={buttonClasses("secondary")}>
            Adjust preferences
          </Link>
          <Link href="/app/discover/browse" className={buttonClasses("ghost")}>
            Browse instead
          </Link>
        </div>
        <MatchDialog card={matchCard} onClose={() => setMatchCard(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <p role="alert" className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush">
          {message}
        </p>
      ) : null}

      <div className="relative">
        <motion.div
          key={current.id}
          style={{ x, rotate }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.9}
          onDragEnd={(_, info) => {
            if (info.offset.x > SWIPE_THRESHOLD) act("like");
            else if (info.offset.x < -SWIPE_THRESHOLD) act("pass");
          }}
          className="touch-pan-y"
        >
          <motion.span style={{ opacity: likeOpacity }} aria-hidden className="pointer-events-none absolute left-5 top-8 z-10 -rotate-12 rounded-xl border-2 border-sage bg-cream/80 px-3 py-1 text-lg font-bold text-cocoa">
            YES
          </motion.span>
          <motion.span style={{ opacity: passOpacity }} aria-hidden className="pointer-events-none absolute right-5 top-8 z-10 rotate-12 rounded-xl border-2 border-mocha bg-cream/80 px-3 py-1 text-lg font-bold text-mocha">
            NOT NOW
          </motion.span>
          <ProfileView card={current} compact />
        </motion.div>
      </div>

      <div className="flex items-center justify-center gap-4" role="group" aria-label="Decide on this profile">
        <RoundButton label={`Pass on ${current.display_name}`} onClick={() => act("pass")} disabled={busy}>
          <X className="size-7" />
        </RoundButton>
        <RoundButton label={`Super like ${current.display_name}`} onClick={() => act("super")} disabled={busy} small>
          <Star className="size-5" />
        </RoundButton>
        <RoundButton label={`Like ${current.display_name}`} onClick={() => act("like")} disabled={busy} primary>
          <Heart className="size-7" />
        </RoundButton>
      </div>
      <p className="text-center text-sm">
        <Link href={`/app/profile/${current.id}`} className="text-clay underline underline-offset-4">
          See full profile
        </Link>
      </p>
      <p className="sr-only">Keyboard: left arrow to pass, right arrow to like, up arrow to super like.</p>

      <MatchDialog card={matchCard} onClose={() => setMatchCard(null)} />
    </div>
  );
}

function RoundButton({
  label,
  onClick,
  disabled,
  primary,
  small,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={
        (small ? "size-12 " : "size-16 ") +
        "inline-flex items-center justify-center rounded-full shadow-[var(--shadow-card)] ring-1 transition-transform active:scale-95 disabled:opacity-50 " +
        (primary ? "bg-clay text-white ring-clay" : "bg-cream text-cocoa ring-oat hover:bg-linen")
      }
    >
      {children}
    </button>
  );
}
