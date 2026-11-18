import { Suspense } from "react";
import { PersonList } from "@/features/discovery/components/person-list";
import { getMatches } from "@/features/discovery/data";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Matches" };

const dateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "short" });

export default function MatchesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Matches />
    </Suspense>
  );
}

async function Matches() {
  const me = await requireActiveMember("/app/matches");
  const matches = await getMatches(me.id);
  const byCard = new Map(matches.map((m) => [m.card.id, m]));
  return (
    <>
      <PageHeader title="Matches" subtitle="People who said yes too. Messaging arrives in the next update." />
      <PersonList
        cards={matches.map((m) => m.card)}
        emptyText="No matches yet. When you and someone both like each other, they'll appear here."
        meta={(c) => `Matched ${dateFmt.format(new Date(byCard.get(c.id)!.createdAt))}`}
      />
    </>
  );
}
