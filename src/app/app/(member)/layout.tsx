import { Suspense } from "react";
import { MemberNav, MemberNavView } from "@/features/member/member-nav";
import { TimezoneSync } from "@/features/member/timezone-sync";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  getMemberTimeZone,
  getUnreadConversationsCount,
} from "@/features/messaging/data";
import { SafetyNotices } from "@/features/safety/components/safety-notices";
import { getOpenSafetyNotices } from "@/features/safety/data";

export const metadata = { robots: { index: false } };

export default function MemberLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<MemberNavView pathname="" />}>
        <NavWithUnread />
      </Suspense>
      <main id="main" className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <Suspense fallback={null}>
            <Notices />
          </Suspense>
          {children}
        </div>
      </main>
      <TimezoneSync />
      <Suspense fallback={null}>
        <TouchLastActive />
      </Suspense>
    </div>
  );
}

/** Records activity (throttled in the database to once per 5 minutes). Renders nothing. */
async function TouchLastActive() {
  const user = await getSessionUser();
  if (user) {
    const supabase = await createClient();
    await supabase.rpc("touch_last_active");
  }
  return null;
}

async function NavWithUnread() {
  const user = await getSessionUser();
  const unread = user ? await getUnreadConversationsCount() : 0;
  return <MemberNav initialUnread={unread} />;
}

async function Notices() {
  const user = await getSessionUser();
  if (!user) return null;
  const [notices, timeZone] = await Promise.all([
    getOpenSafetyNotices(),
    getMemberTimeZone(user.id),
  ]);
  return <SafetyNotices notices={notices} timeZone={timeZone} />;
}
