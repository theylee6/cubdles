import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ProfileActions } from "@/features/discovery/components/profile-actions";
import { ProfileView } from "@/features/discovery/components/profile-view";
import { getCards } from "@/features/discovery/data";
import { PageSkeleton } from "@/features/member/page-header";
import { requireActiveMember } from "@/lib/auth/member";

export const metadata = { title: "Profile" };

export default function ProfilePage({
  params,
}: PageProps<"/app/profile/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Profile params={params} />
    </Suspense>
  );
}

async function Profile({
  params,
}: {
  params: PageProps<"/app/profile/[id]">["params"];
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const me = await requireActiveMember(`/app/profile/${id}`);
  const [card] = await getCards([id]);
  // Not visible (blocked, paused, deleted, not eligible) looks the same as not existing.
  if (!card) notFound();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5">
      <ProfileView card={card} />
      {card.id !== me.id && me.status === "active" ? (
        <ProfileActions card={card} />
      ) : null}
    </div>
  );
}
