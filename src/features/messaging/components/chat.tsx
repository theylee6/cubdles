"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { ArrowLeft, Ban, HeartOff, SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { blockAction, unmatchAction } from "@/features/discovery/actions";
import { ReportButton } from "@/features/safety/components/report-dialog";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  loadEarlierAction,
  loadNewerAction,
  markReadAction,
  sendMessageAction,
} from "../actions";
import {
  MAX_MESSAGE_LENGTH,
  groupByDay,
  mergeMessages,
  normalizeTimestamp,
  timeLabel,
} from "../copy";
import { usePresence } from "../use-presence";
import type { ChatMessage, Message } from "../types";

export type ChatProps = {
  matchId: string;
  meId: string;
  other: {
    id: string;
    name: string;
    photoUrl: string | null;
    age: number | null;
  };
  initialMessages: Message[];
  initialHasMore: boolean;
  initialSeenAt: string | null;
  timeZone: string;
  nowIso: string;
  /** Turn off live updates (used by the development preview). */
  live?: boolean;
  /** Whether I share my online status (privacy setting). */
  shareOnline?: boolean;
};

const POLL_MS = 15_000;

/** One conversation: history, live delivery, optimistic sending, read receipts, unmatch and block. */
export function Chat({
  matchId,
  meId,
  other,
  initialMessages,
  initialHasMore,
  initialSeenAt,
  timeZone,
  nowIso,
  live = true,
  shareOnline = true,
}: ChatProps) {
  const router = useRouter();
  const { otherOnline, otherTyping, notifyTyping, notifyStopped } = usePresence(
    {
      matchId,
      meId,
      otherId: other.id,
      shareOnline,
      enabled: live,
    },
  );
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialMessages.map((m) => ({ ...m, status: "sent" })),
  );
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [seenAt, setSeenAt] = useState<string | null>(initialSeenAt);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState(false);
  const [loadingEarlier, startEarlier] = useTransition();
  const [acting, startActing] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);
  const preserveFrom = useRef<number | null>(null);
  const latestRef = useRef<string | null>(
    initialMessages.at(-1)?.created_at ?? null,
  );

  const confirmed = messages.filter((m) => m.status === "sent");
  const latestConfirmed = confirmed.at(-1)?.created_at ?? null;
  useEffect(() => {
    latestRef.current = latestConfirmed;
  }, [latestConfirmed]);

  // ---------- scrolling ----------
  useLayoutEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (preserveFrom.current !== null) {
      el.scrollTop = el.scrollHeight - preserveFrom.current;
      preserveFrom.current = null;
    } else if (stickToBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const el = listRef.current;
    if (el)
      stickToBottom.current =
        el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }

  // ---------- receiving ----------
  const receive = useCallback(
    (incoming: Message[]) => {
      if (!incoming.length) return;
      setMessages((cur) =>
        mergeMessages(
          cur,
          incoming.map((m) => ({
            ...m,
            created_at: normalizeTimestamp(m.created_at),
            status: "sent" as const,
          })),
        ),
      );
      if (
        incoming.some((m) => m.sender_id !== meId) &&
        document.visibilityState === "visible"
      )
        void markReadAction(matchId);
    },
    [matchId, meId],
  );

  const catchUp = useCallback(async () => {
    const after = latestRef.current;
    if (!after) return router.refresh();
    const r = await loadNewerAction(matchId, after);
    receive(r.messages);
    if (r.seenAt) setSeenAt(normalizeTimestamp(r.seenAt));
  }, [matchId, receive, router]);

  useEffect(() => {
    if (!live || !isSupabaseConfigured()) return;
    const supabase = createClient();
    let poll: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;
    const channel = supabase.channel(`chat:${matchId}`);

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session)
        await supabase.realtime.setAuth(data.session.access_token);
      channel
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => receive([payload.new as Message]),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "match_reads",
            filter: `match_id=eq.${matchId}`,
          },
          (payload) => {
            const row = payload.new as {
              profile_id?: string;
              last_read_at?: string;
            };
            if (row.profile_id === other.id && row.last_read_at)
              setSeenAt(normalizeTimestamp(row.last_read_at));
          },
        )
        .subscribe((status) => {
          // If live updates can't connect, fall back to checking every few seconds.
          if (status === "SUBSCRIBED") {
            if (poll) clearInterval(poll);
            poll = null;
            void catchUp();
          } else if (
            (status === "CHANNEL_ERROR" ||
              status === "TIMED_OUT" ||
              status === "CLOSED") &&
            !poll &&
            !cancelled
          ) {
            poll = setInterval(() => void catchUp(), POLL_MS);
          }
        });
    })();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void catchUp();
        void markReadAction(matchId);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (poll) clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [live, matchId, other.id, receive, catchUp]);

  // ---------- sending ----------
  async function deliver(msg: ChatMessage) {
    const r = await sendMessageAction(matchId, msg.body, msg.client_id);
    if (r.ok) {
      setMessages((cur) =>
        mergeMessages(cur, [
          {
            ...r.message,
            created_at: normalizeTimestamp(r.message.created_at),
            status: "sent",
          },
        ]),
      );
      setError(null);
    } else {
      setMessages((cur) =>
        cur.map((m) =>
          m.client_id === msg.client_id ? { ...m, status: "failed" } : m,
        ),
      );
      setError(r.message);
      if (
        r.code === "conversation_closed" ||
        r.code === "recipient_unavailable"
      )
        setClosed(true);
    }
  }

  function send(event?: FormEvent) {
    event?.preventDefault();
    const body = draft.trim();
    if (!body || closed) return;
    if (body.length > MAX_MESSAGE_LENGTH)
      return setError(
        `Messages can be up to ${MAX_MESSAGE_LENGTH.toLocaleString("en")} characters.`,
      );
    const clientId = crypto.randomUUID();
    const pending: ChatMessage = {
      id: `local-${clientId}`,
      match_id: matchId,
      sender_id: meId,
      body,
      client_id: clientId,
      // Sorts after everything confirmed until the server assigns the real time.
      created_at: new Date(
        Math.max(Date.now(), Date.parse(latestRef.current ?? nowIso) + 1),
      ).toISOString(),
      status: "sending",
    };
    stickToBottom.current = true;
    setDraft("");
    notifyStopped();
    setMessages((cur) => [...cur, pending]);
    void deliver(pending);
  }

  function retry(msg: ChatMessage) {
    setMessages((cur) =>
      cur.map((m) =>
        m.client_id === msg.client_id ? { ...m, status: "sending" } : m,
      ),
    );
    void deliver(msg);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e);
  }

  function loadEarlier() {
    const first = confirmed[0]?.created_at;
    if (!first) return;
    startEarlier(async () => {
      const r = await loadEarlierAction(matchId, first);
      preserveFrom.current =
        (listRef.current?.scrollHeight ?? 0) -
        (listRef.current?.scrollTop ?? 0);
      setMessages((cur) =>
        mergeMessages(
          cur,
          r.messages.map((m) => ({ ...m, status: "sent" as const })),
        ),
      );
      setHasMore(r.hasMore);
    });
  }

  // ---------- ending ----------
  function unmatch() {
    if (
      !window.confirm(
        `Unmatch ${other.name}? Your conversation will be deleted for both of you.`,
      )
    )
      return;
    startActing(async () => {
      const r = await unmatchAction(matchId);
      if (!r.ok) return setError(r.message ?? "That didn't work.");
      router.push("/app/matches");
    });
  }

  function block() {
    if (
      !window.confirm(
        `Block ${other.name}? You'll be hidden from each other everywhere on Cubdles and this conversation will close.`,
      )
    )
      return;
    startActing(async () => {
      const r = await blockAction(other.id);
      if (!r.ok) return setError(r.message ?? "That didn't work.");
      router.push("/app/matches");
    });
  }

  // "Seen" goes under my latest message that they've read.
  const seenMessageId = useMemo(() => {
    if (!seenAt) return null;
    const seen = Date.parse(seenAt);
    const mine = confirmed.filter(
      (m) => m.sender_id === meId && Date.parse(m.created_at) <= seen,
    );
    const last = mine.at(-1);
    const lastOverall = confirmed.at(-1);
    return last && lastOverall && last.id === lastOverall.id ? last.id : null;
  }, [seenAt, confirmed, meId]);

  const groups = groupByDay(messages, nowIso, timeZone);
  const remaining = MAX_MESSAGE_LENGTH - draft.length;

  return (
    <section
      aria-label={`Conversation with ${other.name}`}
      className="flex h-[calc(100dvh-9rem)] flex-col md:h-[calc(100dvh-5.5rem)]"
    >
      <header className="flex items-center gap-3 border-b border-oat pb-3">
        <Link
          href="/app/matches"
          className="rounded-full p-2 text-mocha hover:bg-linen"
          aria-label="Back to matches"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Link
          href={`/app/profile/${other.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-1 hover:bg-linen"
        >
          <span className="size-11 shrink-0 overflow-hidden rounded-full bg-linen">
            {other.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={other.photoUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : null}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">
              {other.name}
              {other.age ? `, ${other.age}` : ""}
            </span>
            <span className="block text-xs text-mocha">
              {otherTyping ? (
                <span className="text-clay">typing…</span>
              ) : otherOnline ? (
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full bg-sage" aria-hidden />{" "}
                  Online now
                </span>
              ) : (
                "View profile"
              )}
            </span>
          </span>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={unmatch}
          disabled={acting}
          aria-label={`Unmatch ${other.name}`}
        >
          <HeartOff className="size-4" aria-hidden />
          <span className="hidden sm:inline">Unmatch</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={block}
          disabled={acting}
          aria-label={`Block ${other.name}`}
        >
          <Ban className="size-4" aria-hidden />
          <span className="hidden sm:inline">Block</span>
        </Button>
        {live ? (
          <ReportButton
            reportedId={other.id}
            name={other.name}
            matchId={matchId}
            afterBlockHref="/app/matches"
            triggerVariant="ghost"
            triggerSize="sm"
            compact
          />
        ) : null}
      </header>

      <div
        ref={listRef}
        onScroll={onScroll}
        className="flex-1 overflow-y-auto py-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasMore ? (
          <div className="mb-4 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={loadEarlier}
              disabled={loadingEarlier}
            >
              {loadingEarlier ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="mx-auto mt-10 max-w-xs text-center text-mocha">
            <p className="font-display text-xl text-cocoa">
              You matched with {other.name}
            </p>
            <p className="mt-2 text-sm">
              Say hello. A question about their profile is a lovely way to
              start.
            </p>
          </div>
        ) : null}

        {groups.map((g) => (
          <div key={g.label + g.items[0].id} className="flex flex-col gap-1.5">
            <p className="my-3 text-center text-xs font-medium text-mocha">
              {g.label}
            </p>
            {g.items.map((m) => {
              const mine = m.sender_id === meId;
              return (
                <div
                  key={m.client_id}
                  className={cn(
                    "flex flex-col",
                    mine ? "items-end" : "items-start",
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] whitespace-pre-wrap break-words rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed",
                      mine
                        ? "rounded-br-lg bg-clay text-cream"
                        : "rounded-bl-lg bg-linen text-cocoa ring-1 ring-oat",
                      m.status === "sending" && "opacity-70",
                      m.status === "failed" &&
                        "bg-blush-soft text-cocoa ring-1 ring-blush",
                    )}
                  >
                    {m.body}
                  </div>
                  <p className="mt-0.5 px-2 text-[11px] text-mocha">
                    {m.status === "sending" ? (
                      "Sending…"
                    ) : m.status === "failed" ? (
                      <button
                        type="button"
                        onClick={() => retry(m)}
                        className="font-medium text-clay underline underline-offset-2"
                      >
                        Not sent. Tap to retry
                      </button>
                    ) : (
                      <>
                        <time dateTime={m.created_at}>
                          {timeLabel(m.created_at, timeZone)}
                        </time>
                        {m.id === seenMessageId ? " · Seen" : ""}
                      </>
                    )}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {error ? (
        <p
          role="alert"
          className="mb-2 rounded-2xl bg-blush-soft px-4 py-2.5 text-sm ring-1 ring-blush"
        >
          {error}
        </p>
      ) : null}

      {closed ? (
        <p className="rounded-2xl bg-linen px-4 py-3 text-center text-sm text-mocha">
          This conversation has ended.
        </p>
      ) : (
        <form
          onSubmit={send}
          className="flex items-end gap-2 border-t border-oat pt-3"
        >
          <label htmlFor="message" className="sr-only">
            Message {other.name}
          </label>
          <textarea
            id="message"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (e.target.value) notifyTyping();
            }}
            onKeyDown={onKeyDown}
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={`Message ${other.name}`}
            className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-3xl bg-cream px-4 py-2.5 text-[15px] ring-1 ring-oat outline-none focus:ring-2 focus:ring-clay"
          />
          <Button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Send"
            className="size-11 shrink-0 rounded-full p-0"
          >
            <SendHorizontal className="size-5" aria-hidden />
          </Button>
        </form>
      )}
      {remaining < 200 && !closed ? (
        <p className="mt-1 text-right text-xs text-mocha" aria-live="polite">
          {remaining} characters left
        </p>
      ) : null}
    </section>
  );
}
