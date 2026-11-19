import Link from "next/link";
import { Suspense } from "react";
import { Heart, Lock } from "lucide-react";
import { Card } from "@/components/ui/primitives";
import { PersonList } from "@/features/discovery/components/person-list";
import {
  getLikesSummary,
  getReceivedLikes,
  getSentLikes,
} from "@/features/discovery/data";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Likes" };

export default function LikesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Likes />
    </Suspense>
  );
}

async function Likes() {
  const me = await requireActiveMember("/app/likes");
  const [summary, sent] = await Promise.all([
    getLikesSummary(),
    getSentLikes(me.id),
  ]);
  const received = summary.canSee ? await getReceivedLikes(me.id) : [];

  return (
    <>
      <PageHeader title="Likes" />

      <section
        aria-labelledby="liked-you"
        className="mb-10 flex flex-col gap-3"
      >
        <h2 id="liked-you" className="text-xl">
          Liked you
        </h2>
        {summary.canSee ? (
          <PersonList
            cards={received}
            emptyText="No new likes yet. They'll appear here."
          />
        ) : (
          <Card className="flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full bg-blush-soft text-clay">
              <Heart className="size-6" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="font-medium">
                {summary.count === 0
                  ? "No new likes yet"
                  : summary.count === 1
                    ? "1 person likes you"
                    : `${summary.count} people like you`}
              </p>
              <p className="text-sm text-mocha">
                {summary.count > 0
                  ? "Keep discovering — if you like them too, it's a match. "
                  : ""}
                <Lock className="mr-1 inline size-3.5" aria-hidden />
                Seeing who comes with{" "}
                <Link
                  href="/pricing"
                  className="text-clay underline underline-offset-4"
                >
                  Cubdles Plus
                </Link>
                .
              </p>
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="you-liked" className="flex flex-col gap-3">
        <h2 id="you-liked" className="text-xl">
          You liked
        </h2>
        <PersonList
          cards={sent}
          emptyText="People you like will appear here until they like you back."
        />
      </section>
    </>
  );
}
