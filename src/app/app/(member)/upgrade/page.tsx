import Link from "next/link";
import { Suspense } from "react";
import { Check } from "lucide-react";
import { Card, Notice } from "@/components/ui/primitives";
import { PageHeader, PageSkeleton } from "@/features/member/page-header";
import { CheckoutButton } from "@/features/billing/components/checkout-button";
import { getBuyablePrices, getMembership } from "@/features/billing/data";
import { requireActiveMember } from "@/lib/auth/member";
import {
  FEATURE_LABELS,
  describeEntitlement,
  getActivePlans,
} from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Cubdles Plus" };

const PERIOD = (m: number) =>
  m === 1 ? "month" : m === 12 ? "year" : `${m} months`;

export default function UpgradePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Upgrade />
    </Suspense>
  );
}

async function Upgrade() {
  const me = await requireActiveMember("/app/upgrade");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("country_code")
    .eq("id", me.id)
    .single();
  const [membership, prices, plans] = await Promise.all([
    getMembership(),
    getBuyablePrices(profile?.country_code ?? null),
    getActivePlans(),
  ]);
  const plus =
    plans.status === "ok"
      ? plans.plans.find((p) => p.code === "plus")
      : undefined;
  const features = (plus?.entitlements ?? [])
    .filter((e) => e.limitValue !== 0 && FEATURE_LABELS[e.featureKey])
    .map((e) => describeEntitlement(e))
    .filter(Boolean) as string[];

  return (
    <>
      <PageHeader
        title="Cubdles Plus"
        subtitle="A few extras for when you'd like them. Meeting people and messaging your matches stay free."
      />
      <Card className="flex flex-col gap-4">
        {features.length ? (
          <ul className="flex flex-col gap-2">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="size-4 text-sage" aria-hidden /> {f}
              </li>
            ))}
          </ul>
        ) : null}

        {membership.planCode === "plus" ? (
          <Notice title="You have Cubdles Plus">
            Manage or cancel it in{" "}
            <Link href="/app/settings" className="underline underline-offset-4">
              Settings
            </Link>
            .
          </Notice>
        ) : prices.length ? (
          <ul className="grid gap-3 sm:grid-cols-2">
            {prices.map((p) => (
              <li
                key={p.id}
                className="flex flex-col gap-3 rounded-2xl bg-linen p-4 ring-1 ring-oat"
              >
                <p>
                  <span className="font-display text-2xl">
                    {formatMoney(p.amountMinor, p.currency)}
                  </span>{" "}
                  <span className="text-mocha">
                    every {PERIOD(p.periodMonths)}
                  </span>
                </p>
                <CheckoutButton
                  priceId={p.id}
                  label={`Choose ${PERIOD(p.periodMonths) === "month" ? "monthly" : PERIOD(p.periodMonths)}`}
                  description={`Cubdles Plus, every ${PERIOD(p.periodMonths)}`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Notice title="Plus isn't on sale yet">
            We&rsquo;re putting the finishing touches on memberships. Everything
            else on Cubdles is free in the meantime.
          </Notice>
        )}

        {prices.length && membership.planCode !== "plus" ? (
          <p className="text-xs text-mocha">
            Renews automatically until you cancel. Cancel any time in Settings;
            you keep Plus until the end of the period you&rsquo;ve paid for.
            Payments are processed securely by Razorpay. Indian cards and UPI
            get a notice before each renewal, as RBI rules require. See our{" "}
            <Link href="/terms" className="underline underline-offset-4">
              terms
            </Link>
            .
          </p>
        ) : null}
      </Card>
    </>
  );
}
