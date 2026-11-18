import Link from "next/link";
import type { ReactNode } from "react";
import type { ProfileCard } from "../types";

/** Simple list of people (likes, matches). Server-renderable. */
export function PersonList({ cards, emptyText, meta }: { cards: ProfileCard[]; emptyText: ReactNode; meta?: (c: ProfileCard) => ReactNode }) {
  if (!cards.length) {
    return <p className="rounded-[var(--radius-card)] bg-linen px-5 py-10 text-center text-mocha ring-1 ring-oat">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {cards.map((c) => (
        <li key={c.id}>
          <Link href={`/app/profile/${c.id}`} className="flex items-center gap-4 rounded-[var(--radius-card)] bg-cream p-3 ring-1 ring-oat hover:bg-linen">
            <div className="size-16 shrink-0 overflow-hidden rounded-2xl bg-linen">
              {c.photos[0]?.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.photos[0].url} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {c.display_name}
                {c.age ? `, ${c.age}` : ""}
              </p>
              <p className="truncate text-sm text-mocha">{meta ? meta(c) : (c.distance_label ?? c.city)}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
