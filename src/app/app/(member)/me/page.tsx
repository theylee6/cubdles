import Link from "next/link";
import { Suspense } from "react";
import { ChevronRight, Settings } from "lucide-react";
import { buttonClasses } from "@/components/ui/button";
import { ProfileView } from "@/features/discovery/components/profile-view";
import { getCards } from "@/features/discovery/data";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { SavedNotice } from "@/features/settings/saved-notice";
import { EDIT_SECTIONS } from "@/features/settings/sections";
import { VisibilityNotice } from "@/features/member/visibility";
import { requireActiveMember } from "@/lib/auth/member";
import { VerificationCard } from "@/features/verification/components/verification-card";
import { getVerificationState } from "@/features/verification/data";

export const metadata = { title: "Your profile" };

export default function MePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Me />
    </Suspense>
  );
}

async function Me() {
  const me = await requireActiveMember("/app/me");
  const [[card], verification] = await Promise.all([
    getCards([me.id]),
    getVerificationState(me.id),
  ]);

  return (
    <>
      <PageHeader
        title="Your profile"
        subtitle="This is how others see you."
        actions={
          <Link
            href="/app/settings"
            className={buttonClasses("secondary", "sm")}
          >
            <Settings className="size-4" aria-hidden /> Settings
          </Link>
        }
      />
      <SavedNotice />
      <VisibilityNotice memberId={me.id} className="mb-6" />
      <div className="grid gap-8 lg:grid-cols-[1fr_260px]">
        <div className="mx-auto w-full max-w-md">
          {card ? <ProfileView card={card} /> : null}
        </div>
        <nav
          aria-label="Edit your profile"
          className="flex flex-col gap-2 self-start"
        >
          <VerificationCard state={verification} />
          <h2 className="mt-4 mb-1 text-lg">Edit</h2>
          {EDIT_SECTIONS.map((s) => (
            <Link
              key={s.slug}
              href={`/app/me/edit/${s.slug}`}
              className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 ring-1 ring-oat hover:bg-linen"
            >
              {s.label}
              <ChevronRight className="size-4 text-mocha" aria-hidden />
            </Link>
          ))}
          <p className="mt-2 text-xs text-mocha">
            Your preview includes photos still in review; others only see
            approved ones.
          </p>
        </nav>
      </div>
    </>
  );
}
