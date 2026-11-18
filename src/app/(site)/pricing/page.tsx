import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PageHero } from "@/components/site/page-parts";
import { ButtonLink } from "@/components/ui/button";
import { Card, Container, Notice } from "@/components/ui/primitives";
import { FEATURE_LABELS, describeEntitlement, getActivePlans, perMonthMinor, savingsPercent, type Plan } from "@/lib/plans";
import { formatMoney } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Membership and pricing",
  description: "Cubdles is free to join, match and message. Cubdles Plus adds extras like seeing who liked you.",
};

const ALWAYS_FREE = [
  "Create a full profile and affection profile",
  "Discover people by swiping or browsing",
  "Mutual matching and unlimited messaging with matches",
  "Blocking, reporting and every safety feature",
];

export default async function PricingPage() {
  const result = await getActivePlans();

  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Free to fall for someone"
        intro="Everything you need to meet people and talk to your matches is free. Cubdles Plus is for when you'd like a few extras."
      />
      <Container className="flex flex-col gap-12">
        <Card className="flex flex-col gap-4 bg-sage-soft/60 ring-sage/30">
          <h2 className="text-xl">Always free, for everyone</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {ALWAYS_FREE.map((item) => (
              <li key={item} className="flex gap-2.5 text-cocoa">
                <Check className="mt-0.5 size-5 shrink-0 text-clay" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </Card>

        {result.status === "ok" && result.plans.length > 0 ? (
          <PlanGrid plans={result.plans} />
        ) : (
          <Notice title="Membership prices aren't published yet">
            {result.status === "error"
              ? "We couldn't load prices just now. Please refresh in a moment."
              : "Paid plans will appear here once they're set up. Everything above is free in the meantime."}
          </Notice>
        )}

        <p className="text-sm text-mocha">
          Prices include applicable taxes unless shown otherwise. Memberships renew automatically and you can cancel any
          time from Settings — you keep your features until the end of the period you&rsquo;ve paid for. We never store
          your card details.
        </p>
      </Container>
    </>
  );
}

function PlanGrid({ plans }: { plans: Plan[] }) {
  const featureKeys = Object.keys(FEATURE_LABELS).filter((k) => plans.some((p) => p.entitlements.some((e) => e.featureKey === k)));

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {plans.map((plan) => {
        const monthly = plan.prices.find((p) => p.periodMonths === 1);
        const byKey = new Map(plan.entitlements.map((e) => [e.featureKey, e]));
        return (
          <Card key={plan.id} className={plan.isFree ? "flex flex-col gap-6" : "flex flex-col gap-6 bg-cream ring-2 ring-clay/40"}>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl">{plan.name}</h2>
              {plan.description ? <p className="text-mocha">{plan.description}</p> : null}
            </div>

            {plan.isFree ? (
              <p className="font-display text-4xl">Free</p>
            ) : plan.prices.length > 0 ? (
              <ul className="flex flex-col gap-2" aria-label={`${plan.name} prices`}>
                {plan.prices.map((price) => {
                  const save = savingsPercent(price, monthly);
                  return (
                    <li key={price.id} className="flex items-baseline justify-between gap-4 rounded-2xl bg-linen px-4 py-3 ring-1 ring-oat">
                      <span className="text-cocoa">
                        {price.periodMonths === 1 ? "1 month" : `${price.periodMonths} months`}
                        {save ? <span className="ml-2 rounded-full bg-blush-soft px-2 py-0.5 text-xs font-medium text-clay-deep">Save {save}%</span> : null}
                      </span>
                      <span className="text-right">
                        <span className="font-display text-xl text-cocoa">{formatMoney(price.amountMinor, price.currency)}</span>
                        {price.periodMonths > 1 ? (
                          <span className="block text-xs text-mocha">{formatMoney(perMonthMinor(price), price.currency)} / month</span>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-mocha">Price coming soon.</p>
            )}

            <ul className="flex flex-col gap-2.5 border-t border-oat pt-5">
              {featureKeys.map((key) => {
                const value = describeEntitlement(byKey.get(key));
                return (
                  <li key={key} className="flex items-center justify-between gap-4">
                    <span className={value ? "text-cocoa" : "text-mocha"}>{FEATURE_LABELS[key]}</span>
                    {value ? (
                      <span className="flex items-center gap-1.5 text-sm text-cocoa">
                        <Check className="size-4 text-clay" aria-hidden /> {value}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-mocha">
                        <Minus className="size-4" aria-hidden />
                        <span className="sr-only">Not included</span>
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>

            <ButtonLink href="/join" variant={plan.isFree ? "secondary" : "primary"} className="mt-auto">
              {plan.isFree ? "Join free" : `Join, then upgrade`}
            </ButtonLink>
          </Card>
        );
      })}
    </div>
  );
}
