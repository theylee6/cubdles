import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/primitives";
import { RestoreButton } from "@/features/settings/restore-button";
import { getMember } from "@/lib/auth/member";
import { signOutAction } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Your account", robots: { index: false } };

const dateFmt = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" });

export default function RestorePage() {
  return (
    <Container className="flex min-h-dvh max-w-lg flex-col gap-8 py-10">
      <Wordmark />
      <main id="main">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-linen" />}>
          <Restore />
        </Suspense>
      </main>
    </Container>
  );
}

async function Restore() {
  const m = await getMember("/app/restore");
  if (m.status !== "deleted") redirect("/app");
  const supabase = await createClient();
  const { data } = await supabase.from("profile_private").select("deletion_requested_at, status_before_deletion").eq("profile_id", m.id).single();
  const requested = data?.deletion_requested_at ? new Date(data.deletion_requested_at) : null;
  const purgeOn = requested ? new Date(requested.getTime() + 30 * 864e5) : null;
  const restorable = data?.status_before_deletion && ["onboarding", "active", "paused"].includes(data.status_before_deletion);

  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-3xl">Your account is scheduled for deletion</h1>
      <p className="text-mocha">
        Your profile is hidden and your matches have ended.
        {purgeOn ? ` Everything will be permanently deleted on ${dateFmt.format(purgeOn)}.` : ""}
      </p>
      {restorable ? (
        <RestoreButton />
      ) : (
        <p className="text-sm text-mocha">This account can&rsquo;t be restored here. Contact us if you think that&rsquo;s a mistake.</p>
      )}
      <form action={signOutAction}>
        <Button type="submit" variant="ghost">Log out</Button>
      </form>
    </Card>
  );
}
