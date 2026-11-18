import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { BrowseView } from "@/features/discovery/components/browse-view";
import { getDiscoverPage } from "@/features/discovery/data";
import { getMyFeatures } from "@/features/member/features";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Browse" };

export default function BrowsePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Browse />
    </Suspense>
  );
}

async function Browse() {
  await requireActiveMember("/app/discover/browse");
  const [page, features] = await Promise.all([getDiscoverPage({}, 0, 12), getMyFeatures()]);
  return (
    <>
      <Link href="/app/discover" className="mb-3 inline-flex items-center gap-1.5 text-sm text-mocha hover:text-cocoa">
        <ArrowLeft className="size-4" aria-hidden /> Back to swiping
      </Link>
      <PageHeader title="Browse" subtitle="Everyone who fits your preferences, best matches first." />
      <BrowseView initial={page.cards} initialNext={page.nextOffset} advancedAllowed={features.advanced_filters} />
    </>
  );
}
