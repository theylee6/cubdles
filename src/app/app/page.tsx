import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand";
import { MugIllustration } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, Container, Notice } from "@/components/ui/primitives";
import { signOutAction } from "@/lib/auth/actions";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your Cubdles", robots: { index: false } };

/**
 * Signed-in home. Onboarding (M2) and discovery (M3) will replace the "coming next" panel.
 * The session is read at request time, so it streams in behind Suspense.
 */
export default function MemberHome() {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-oat/60">
        <Container className="flex h-16 items-center justify-between">
          <Wordmark />
          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Log out
            </Button>
          </form>
        </Container>
      </header>
      <main id="main">
        <Container className="py-12">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-linen" />}>
            <MemberPanel />
          </Suspense>
        </Container>
      </main>
    </div>
  );
}

const STATUS_COPY: Record<string, string> = {
  onboarding: "Your account is set up. Next comes your profile.",
  active: "Your profile is live.",
  paused: "Your profile is paused, so nobody new can see you.",
  suspended: "Your account is suspended.",
  banned: "Your account has been closed for breaking our guidelines.",
};

async function MemberPanel() {
  if (!isSupabaseConfigured()) {
    return <Notice tone="warning" title="Accounts aren't connected yet">This site isn&rsquo;t connected to its database.</Notice>;
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/app");

  const { data: profile } = await supabase.from("profiles").select("status, status_reason, display_name").eq("id", userId).single();
  const status = profile?.status ?? "onboarding";

  if (status === "suspended" && profile?.status_reason === "age_gate") {
    return (
      <Notice tone="warning" title="Cubdles is for adults only">
        Based on the date of birth you gave, you can&rsquo;t use Cubdles. If you think this is a mistake, please contact
        us.
      </Notice>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-6">
        <h1 className="text-4xl">Hello{profile?.display_name ? `, ${profile.display_name}` : ""}</h1>
        <p className="text-lg text-mocha">{STATUS_COPY[status] ?? ""}</p>
        <Card className="flex flex-col gap-3">
          <h2 className="text-xl">Coming next</h2>
          <p className="text-mocha">
            Profile set-up, discovery and messaging are being built now. This page will become your home for all of
            them. We&rsquo;ll email you when your profile can be completed.
          </p>
        </Card>
      </div>
      <MugIllustration className="mx-auto w-40" />
    </div>
  );
}
