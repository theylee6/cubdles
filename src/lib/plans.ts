import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { isSupabaseConfigured } from "@/lib/env";
import { createAnonClient } from "@/lib/supabase/server";

export type PlanPrice = { id: string; periodMonths: number; currency: string; amountMinor: number };
export type Entitlement = { featureKey: string; limitValue: number | null; period: "day" | "week" | "month" | null };
export type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isFree: boolean;
  prices: PlanPrice[];
  entitlements: Entitlement[];
};

export type PlansResult =
  | { status: "ok"; plans: Plan[] }
  | { status: "unconfigured" }
  | { status: "error" };

type Row = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_free: boolean;
  sort_order: number;
  plan_prices: { id: string; period_months: number; currency: string; amount_minor: number }[];
  entitlements: { feature_key: string; limit_value: number | null; period: Entitlement["period"] }[];
};

/** Active plans with prices and entitlements, read from the database (never hardcoded). Cached for an hour. */
export async function getActivePlans(): Promise<PlansResult> {
  "use cache";
  cacheLife("hours");
  cacheTag("plans");

  if (!isSupabaseConfigured()) return { status: "unconfigured" };

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("plans")
    .select("id, code, name, description, is_free, sort_order, plan_prices(id, period_months, currency, amount_minor), entitlements(feature_key, limit_value, period)")
    .order("sort_order");

  if (error || !data) {
    console.error("getActivePlans failed", error?.code);
    return { status: "error" };
  }

  return { status: "ok", plans: (data as Row[]).map(toPlan) };
}

export function toPlan(row: Row): Plan {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isFree: row.is_free,
    prices: [...row.plan_prices]
      .sort((a, b) => a.period_months - b.period_months)
      .map((p) => ({ id: p.id, periodMonths: p.period_months, currency: p.currency, amountMinor: p.amount_minor })),
    entitlements: row.entitlements.map((e) => ({ featureKey: e.feature_key, limitValue: e.limit_value, period: e.period })),
  };
}

/** Human labels for feature keys. Limits and prices come from the database. */
export const FEATURE_LABELS: Record<string, string> = {
  daily_likes: "Likes",
  super_likes: "Super likes",
  see_likes: "See who liked you",
  advanced_filters: "Advanced filters",
  undo: "Undo your last pass",
  incognito: "Incognito browsing",
  boosts: "Profile boosts",
  note_with_like: "Add a note to a like",
};

const PERIOD_WORD = { day: "a day", week: "a week", month: "a month" } as const;

/** Describe one entitlement: "Unlimited", "25 a day", "Included", or null when not included. */
export function describeEntitlement(e: Entitlement | undefined): string | null {
  if (!e) return null;
  if (e.limitValue === 0) return null;
  if (e.limitValue === null) return e.period ? "Unlimited" : "Included";
  return e.period ? `${e.limitValue} ${PERIOD_WORD[e.period]}` : `${e.limitValue}`;
}

/** Monthly-equivalent price, rounded to whole currency units. */
export function perMonthMinor(price: PlanPrice): number {
  return Math.round(price.amountMinor / price.periodMonths / 100) * 100;
}

/** Percentage saved per month versus the 1-month price, or null. */
export function savingsPercent(price: PlanPrice, monthly: PlanPrice | undefined): number | null {
  if (!monthly || price.periodMonths === 1 || monthly.currency !== price.currency) return null;
  const pct = Math.round((1 - price.amountMinor / price.periodMonths / monthly.amountMinor) * 100);
  return pct > 0 ? pct : null;
}
