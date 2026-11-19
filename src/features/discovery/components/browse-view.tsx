"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/primitives";
import {
  CUDDLE_STYLES,
  INTENTIONS,
  PACES,
} from "@/features/onboarding/options";
import { cn } from "@/lib/utils";
import { loadDiscoverPage } from "../actions";
import type { DiscoverFilters, ProfileCard } from "../types";

/** Grid browsing with filters. Intention filtering is free; the rest needs Cubdles Plus (enforced in the DB). */
export function BrowseView({
  initial,
  initialNext,
  advancedAllowed,
}: {
  initial: ProfileCard[];
  initialNext: number | null;
  advancedAllowed: boolean;
}) {
  const [filters, setFilters] = useState<DiscoverFilters>({});
  const [cards, setCards] = useState(initial);
  const [next, setNext] = useState(initialNext);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function load(f: DiscoverFilters, offset: number) {
    start(async () => {
      const page = await loadDiscoverPage(f, offset);
      if (page.error) {
        setMessage(page.error);
        return;
      }
      setMessage(null);
      setCards((prev) =>
        offset === 0 ? page.cards : [...prev, ...page.cards],
      );
      setNext(page.nextOffset);
    });
  }

  function toggle(
    key: "intentions" | "cuddle_styles" | "paces",
    value: string,
  ) {
    const cur = new Set(filters[key] ?? []);
    if (cur.has(value)) cur.delete(value);
    else cur.add(value);
    const f = { ...filters, [key]: cur.size ? [...cur] : undefined };
    if (!f[key]) delete f[key];
    setFilters(f);
    load(f, 0);
  }

  function toggleRecent() {
    const f = { ...filters };
    if (f.recently_active_days) delete f.recently_active_days;
    else f.recently_active_days = 7;
    setFilters(f);
    load(f, 0);
  }

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Filters"
        className="flex flex-col gap-4 rounded-[var(--radius-card)] bg-linen/70 p-4 ring-1 ring-oat"
      >
        <FilterRow label="Looking for">
          {INTENTIONS.map((o) => (
            <FilterChip
              key={o.value}
              on={filters.intentions?.includes(o.value)}
              onClick={() => toggle("intentions", o.value)}
            >
              {o.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Cuddle style" locked={!advancedAllowed}>
          {CUDDLE_STYLES.map((o) => (
            <FilterChip
              key={o.value}
              disabled={!advancedAllowed}
              on={filters.cuddle_styles?.includes(o.value)}
              onClick={() => toggle("cuddle_styles", o.value)}
            >
              {o.label}
            </FilterChip>
          ))}
        </FilterRow>
        <FilterRow label="Pace" locked={!advancedAllowed}>
          {PACES.map((o) => (
            <FilterChip
              key={o.value}
              disabled={!advancedAllowed}
              on={filters.paces?.includes(o.value)}
              onClick={() => toggle("paces", o.value)}
            >
              {o.label}
            </FilterChip>
          ))}
          <FilterChip
            disabled={!advancedAllowed}
            on={Boolean(filters.recently_active_days)}
            onClick={toggleRecent}
          >
            Active this week
          </FilterChip>
        </FilterRow>
        {!advancedAllowed ? (
          <p className="text-sm text-mocha">
            <Lock className="mr-1 inline size-3.5" aria-hidden />
            Cuddle style, pace and activity filters come with{" "}
            <Link
              href="/pricing"
              className="text-clay underline underline-offset-4"
            >
              Cubdles Plus
            </Link>
            .
          </p>
        ) : null}
      </section>

      {message ? (
        <p
          role="alert"
          className="rounded-2xl bg-blush-soft px-4 py-3 text-sm ring-1 ring-blush"
        >
          {message}
        </p>
      ) : null}

      {cards.length ? (
        <ul
          className={cn(
            "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
            pending && "opacity-60",
          )}
          aria-busy={pending}
        >
          {cards.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/profile/${c.id}`}
                className="group block overflow-hidden rounded-[var(--radius-card)] bg-cream ring-1 ring-oat"
              >
                <div className="aspect-[4/5] bg-linen">
                  {c.photos[0]?.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.photos[0].url}
                      alt=""
                      className="size-full object-cover transition-transform group-hover:scale-[1.02]"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="font-medium">
                    {c.display_name}
                    {c.age ? `, ${c.age}` : ""}
                  </p>
                  <p className="text-xs text-mocha">
                    {c.distance_label ?? c.city}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[var(--radius-card)] bg-linen px-5 py-10 text-center text-mocha ring-1 ring-oat">
          {pending ? "Looking…" : "No one matches these filters right now."}
        </p>
      )}

      {next !== null && cards.length ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => load(filters, next)}
          >
            {pending ? "Loading…" : "Show more"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function FilterRow({
  label,
  locked,
  children,
}: {
  label: string;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label={label}>
      <p className="text-sm font-medium">
        {label}
        {locked ? (
          <Lock
            className="ml-1.5 inline size-3.5 text-mocha"
            aria-label="Cubdles Plus"
          />
        ) : null}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FilterChip({
  on,
  disabled,
  onClick,
  children,
}: {
  on?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={Boolean(on)}
      disabled={disabled}
      onClick={onClick}
      className="rounded-full disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Chip selected={on}>{children}</Chip>
    </button>
  );
}
