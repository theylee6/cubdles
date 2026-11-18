import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, Container } from "@/components/ui/primitives";
import { signOutAction } from "@/lib/auth/actions";
import { getMember } from "@/lib/auth/member";

export const metadata = { title: "Your account", robots: { index: false } };

export default function AccountStatusPage() {
  return (
    <Container className="flex min-h-dvh max-w-lg flex-col gap-8 py-10">
      <Wordmark />
      <main id="main">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-linen" />}>
          <Status />
        </Suspense>
      </main>
    </Container>
  );
}

async function Status() {
  const m = await getMember("/app/account-status");
  if (m.status === "active" || m.status === "paused" || m.status === "onboarding") redirect("/app");
  if (m.status === "deleted") redirect("/app/restore");

  const ageGate = m.statusReason === "age_gate";
  return (
    <Card className="flex flex-col gap-4">
      <h1 className="text-3xl">{ageGate ? "Cubdles is for adults only" : m.status === "banned" ? "Your account has been closed" : "Your account is on hold"}</h1>
      <p className="text-mocha">
        {ageGate
          ? "Based on the date of birth you gave, you can't use Cubdles."
          : m.status === "banned"
            ? "This account broke our community guidelines and has been closed."
            : "Our team has paused this account while we look into a report."}{" "}
        If you think this is a mistake, please <Link href="/contact" className="text-clay underline underline-offset-4">contact us</Link>.
      </p>
      <form action={signOutAction}>
        <Button type="submit" variant="secondary">Log out</Button>
      </form>
    </Card>
  );
}
