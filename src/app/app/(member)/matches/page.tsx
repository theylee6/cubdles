import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { ConversationList } from "@/features/messaging/components/conversation-list";
import { LiveRefresh } from "@/features/messaging/components/live-refresh";
import { getConversations, getMemberTimeZone } from "@/features/messaging/data";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Matches" };

export default function MatchesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Matches />
    </Suspense>
  );
}

async function Matches() {
  const me = await requireActiveMember("/app/matches");
  const [items, timeZone] = await Promise.all([
    getConversations(),
    getMemberTimeZone(me.id),
  ]);
  return (
    <>
      <PageHeader
        title="Matches"
        subtitle="People who said yes too. Pick up a conversation or start a new one."
      />
      <ConversationList
        items={items}
        nowIso={new Date().toISOString()}
        timeZone={timeZone}
      />
      <LiveRefresh />
    </>
  );
}
