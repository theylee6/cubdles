import Link from "next/link";
import { cn } from "@/lib/utils";
import { listTimeLabel } from "../copy";
import type { ConversationSummary } from "../types";

/** Matches as conversations: newest activity first, unread ones highlighted. Server-renderable. */
export function ConversationList({
  items,
  nowIso,
  timeZone,
}: {
  items: ConversationSummary[];
  nowIso: string;
  timeZone: string;
}) {
  if (!items.length) {
    return (
      <p className="rounded-[var(--radius-card)] bg-linen px-5 py-10 text-center text-mocha ring-1 ring-oat">
        No matches yet. When you and someone both like each other, they&rsquo;ll
        appear here and you can start talking.
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map((c) => {
        const unread = c.unread > 0;
        const preview = c.preview
          ? `${c.lastMine ? "You: " : ""}${c.preview}`
          : "New match. Say hello!";
        return (
          <li key={c.matchId}>
            <Link
              href={`/app/matches/${c.matchId}`}
              className="flex items-center gap-4 rounded-[var(--radius-card)] bg-cream p-3 ring-1 ring-oat hover:bg-linen"
            >
              <span className="size-14 shrink-0 overflow-hidden rounded-full bg-linen">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.photoUrl}
                    alt=""
                    className="size-full object-cover"
                  />
                ) : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span
                    className={cn(
                      "truncate",
                      unread ? "font-semibold" : "font-medium",
                    )}
                  >
                    {c.name}
                  </span>
                  <span className="shrink-0 text-xs text-mocha">
                    {listTimeLabel(
                      c.lastMessageAt ?? c.matchedAt,
                      nowIso,
                      timeZone,
                    )}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      unread ? "font-medium text-cocoa" : "text-mocha",
                      !c.preview && "text-clay",
                    )}
                  >
                    {preview}
                  </span>
                  {unread ? (
                    <span className="grid min-w-5 shrink-0 place-items-center rounded-full bg-clay px-1.5 text-xs font-semibold text-white">
                      <span className="sr-only">Unread messages: </span>
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  ) : null}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
