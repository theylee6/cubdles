import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getMember } from "@/lib/auth/member";

export const metadata = { title: "Your Cubdles", robots: { index: false } };

/** /app routes each member to the right place for their account state. */
export default function AppIndex() {
  return (
    <Suspense fallback={<div className="min-h-dvh" aria-busy="true" />}>
      <Route />
    </Suspense>
  );
}

async function Route(): Promise<never> {
  const m = await getMember("/app");
  if (m.status === "onboarding") redirect("/onboarding");
  if (m.status === "deleted") redirect("/app/restore");
  if (m.status === "active" || m.status === "paused") redirect("/app/discover");
  redirect("/app/account-status");
}
