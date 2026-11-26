import Link from "next/link";
import { Suspense } from "react";
import { LayoutGrid } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { Notice } from "@/components/ui/primitives";
import { getDailyPicks, getDiscoverPage } from "@/features/discovery/data";
import { SwipeDeck } from "@/features/discovery/components/swipe-deck";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { getSafetyAdvisory } from "@/features/member/safety";
import { SafetyAdvisoryNotice } from "@/features/member/safety-advisory";
import { VisibilityNotice } from "@/features/member/visibility";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Discover />
    </Suspense>
  );
}

async function Discover() {
  const member = await requireActiveMember("/app/discover");
  const advisory = await getSafetyAdvisory();

  const header = (
    <>
      <PageHeader
        title="Discover"
        subtitle="People nearby who fit what you're looking for."
        actions={
          <Link
            href="/app/discover/browse"
            className={buttonClasses("secondary", "sm")}
          >
            <LayoutGrid className="size-4" aria-hidden /> Browse
          </Link>
        }
      />
      <SafetyAdvisoryNotice advisory={advisory} className="mb-4" />
      <VisibilityNotice memberId={member.id} className="mb-4" />
    </>
  );

  if (member.status === "paused") {
    return (
      <>
        {header}
        <Notice title="Your profile is paused">
          Nobody new can see you, and you can&rsquo;t like people while paused.
          Your matches stay as they are.{" "}
          <Link
            href="/app/settings"
            className="text-clay underline underline-offset-4"
          >
            Unpause in settings
          </Link>
          .
        </Notice>
      </>
    );
  }

  // Today's picks come first (stable for the day), then the ranked queue.
  const [picks, page] = await Promise.all([
    getDailyPicks(),
    getDiscoverPage({}, 0),
  ]);
  const initial = [
    ...picks,
    ...page.cards.filter((c) => !picks.some((p) => p.id === c.id)),
  ];

  return (
    <>
      {header}
      {picks.length ? (
        <p className="mb-3 text-sm text-mocha">
          Starting with today&rsquo;s {picks.length} picks for you.
        </p>
      ) : null}
      <div className="mx-auto max-w-md">
        <SwipeDeck initial={initial} initialOffset={page.nextOffset} />
      </div>
    </>
  );
}
