import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { VerificationQueue } from "@/features/admin/components/verification-queue";
import { getPendingVerifications } from "@/features/admin/data";
import { requireModerator } from "@/lib/auth/staff";

export const metadata = { title: "Verifications" };

export default function AdminVerifications() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Queue />
    </Suspense>
  );
}

async function Queue() {
  await requireModerator("/admin/verifications");
  const items = await getPendingVerifications();
  return (
    <>
      <PageHeader
        title="Verifications"
        subtitle="Same person as in the photos, copying the requested pose, and a live photo (not a photo of a screen). Selfies are deleted after your decision."
      />
      <VerificationQueue items={items} />
    </>
  );
}
