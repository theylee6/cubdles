import { Suspense } from "react";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { PhotoQueue } from "@/features/admin/components/photo-queue";
import { getPendingPhotos } from "@/features/admin/data";
import { requireModerator } from "@/lib/auth/staff";

export const metadata = { title: "Photos" };

export default function AdminPhotos() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Photos />
    </Suspense>
  );
}

async function Photos() {
  await requireModerator("/admin/photos");
  const photos = await getPendingPhotos();
  return (
    <>
      <PageHeader
        title="Photos to review"
        subtitle="Oldest first. Approve clear photos of the member themselves; reject anything else with a reason the member will see."
      />
      <PhotoQueue photos={photos} />
    </>
  );
}
