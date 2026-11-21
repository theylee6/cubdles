import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { PageSkeleton } from "@/features/member/page-header";
import { Chat } from "@/features/messaging/components/chat";
import { getConversation, getMemberTimeZone } from "@/features/messaging/data";
import { requireActiveMember } from "@/lib/auth/member";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const [conversation, timeZone, { data: privacy }] = await Promise.all([
    getConversation(matchId, me.id),
    getMemberTimeZone(me.id),
    supabase.from("privacy_settings").select("show_online_status").eq("profile_id", me.id).maybeSingle(),
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
      shareOnline={privacy?.show_online_status ?? true}
    />
  );
}
