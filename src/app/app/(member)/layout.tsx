import { Suspense } from "react";
import { MemberNav, MemberNavView } from "@/features/member/member-nav";
import { TimezoneSync } from "@/features/member/timezone-sync";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";

export const metadata = { robots: { index: false } };

export default function MemberLayout({ children }: LayoutProps<"/app">) {
  return (
    <div className="min-h-dvh">
      <Suspense fallback={<MemberNavView pathname="" />}>
        <MemberNav />
      </Suspense>
      <main id="main" className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">{children}</div>
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
