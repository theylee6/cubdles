import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageSkeleton } from "@/features/member/page-header";
import { Chat } from "@/features/messaging/components/chat";
import { getConversation, getMemberTimeZone } from "@/features/messaging/data";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Messages" };

export default function ConversationPage({
  params,
}: PageProps<"/app/matches/[matchId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({
  params,
}: {
  params: PageProps<"/app/matches/[matchId]">["params"];
}) {
  const { matchId } = await params;
  if (!z.uuid().safeParse(matchId).success) notFound();
  const me = await requireActiveMember(`/app/matches/${matchId}`);
  const [conversation, timeZone] = await Promise.all([
    getConversation(matchId, me.id),
    getMemberTimeZone(me.id),
  ]);
  // Ended, blocked, or not yours: all look the same.
  if (!conversation) notFound();
  const { other } = conversation;

  return (
    <Chat
      key={matchId}
      matchId={matchId}
      meId={me.id}
      other={{
        id: other.id,
        name: other.display_name ?? "Your match",
        photoUrl: other.photos[0]?.url ?? null,
        age: other.age,
      }}
      initialMessages={conversation.messages}
      initialHasMore={conversation.hasMore}
      initialSeenAt={conversation.seenAt}
      timeZone={timeZone}
      nowIso={new Date().toISOString()}
    />
  );
}
