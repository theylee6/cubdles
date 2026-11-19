import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { MemberNavView } from "@/features/member/member-nav";
import { Chat } from "@/features/messaging/components/chat";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import type { ConversationSummary, Message } from "@/features/messaging/types";

/** DEVELOPMENT ONLY: messaging components with sample data (no real people, no network). 404 in production. */
const ME = "00000000-0000-0000-0000-00000000000a";
const THEM = "00000000-0000-0000-0000-00000000000b";
const MATCH = "00000000-0000-0000-0000-0000000000c1";

function sample(nowMs: number): Message[] {
  const at = (minsAgo: number) =>
    new Date(nowMs - minsAgo * 60_000).toISOString();
  const lines: [string, number, string][] = [
    [THEM, 60 * 26, "Hi! Your blanket-fort prompt made me laugh."],
    [ME, 60 * 26 - 5, "Ha, thank you. It's a serious engineering discipline."],
    [THEM, 60 * 25, "Load-bearing cushions?"],
    [ME, 42, "Only the finest. How's your week going?"],
    [THEM, 30, "Slow and lovely. Chai and a long film tonight.\n\nYou?"],
    [ME, 12, "Same plan, different film. Recommendations welcome."],
  ];
  return lines.map(([sender, mins, body], i) => ({
    id: `00000000-0000-0000-0000-0000000001${String(i).padStart(2, "0")}`,
    match_id: MATCH,
    sender_id: sender,
    body,
    client_id: `00000000-0000-0000-0000-0000000002${String(i).padStart(2, "0")}`,
    created_at: at(mins),
  }));
}

export default function DevMessagesPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <Suspense fallback={null}>
      <Preview />
    </Suspense>
  );
}

async function Preview() {
  await connection();
  const now = new Date().getTime();
  const nowIso = new Date(now).toISOString();
  const messages = sample(now);
  const list: ConversationSummary[] = [
    {
      matchId: MATCH,
      otherId: THEM,
      name: "Sample A",
      photoUrl: null,
      matchedAt: nowIso,
      lastMessageAt: messages.at(-1)!.created_at,
      preview: messages.at(-1)!.body,
      lastMine: true,
      unread: 0,
    },
    {
      matchId: "x1",
      otherId: "y1",
      name: "Sample B",
      photoUrl: null,
      matchedAt: nowIso,
      lastMessageAt: nowIso,
      preview: "Are you free on Sunday?",
      lastMine: false,
      unread: 2,
    },
    {
      matchId: "x2",
      otherId: "y2",
      name: "Sample C",
      photoUrl: null,
      matchedAt: nowIso,
      lastMessageAt: null,
      preview: null,
      lastMine: false,
      unread: 0,
    },
  ];
  return (
    <div className="min-h-dvh">
      <MemberNavView pathname="/app/matches" unread={1} />
      <main className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto grid w-full max-w-5xl gap-10 px-4 py-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-4 text-xl">Conversation list</h2>
            <ConversationList
              items={list}
              nowIso={nowIso}
              timeZone="Asia/Kolkata"
            />
          </section>
          <section>
            <h2 className="mb-4 text-xl">Chat (offline preview)</h2>
            <Chat
              matchId={MATCH}
              meId={ME}
              other={{ id: THEM, name: "Sample A", photoUrl: null, age: 29 }}
              initialMessages={messages}
              initialHasMore
              initialSeenAt={messages.at(-1)!.created_at}
              timeZone="Asia/Kolkata"
              nowIso={nowIso}
              live={false}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
