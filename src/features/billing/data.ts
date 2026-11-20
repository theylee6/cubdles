import "server-only";
import { headers } from "next/headers";
import { z } from "zod";
import { currencyForCountry } from "@/lib/currency";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { createClient } from "@/lib/supabase/server";

export type Membership = {
  planCode: string;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    planName: string;
    periodMonths: number | null;
    currency: string | null;
    amountMinor: number | null;
  } | null;
};

const schema = z.object({
  plan_code: z.string(),
  subscription: z
    .object({
      status: z.string(),
      current_period_end: z.string().nullable(),
      cancel_at_period_end: z.boolean(),
      plan_name: z.string(),
      period_months: z.number().nullable(),
      currency: z.string().nullable(),
      amount_minor: z.number().nullable(),
    })
    .nullable(),
});

export async function getMembership(): Promise<Membership> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("my_membership");
  const p = schema.safeParse(data);
  if (!p.success) return { planCode: "free", subscription: null };
  const s = p.data.subscription;
  return {
    planCode: p.data.plan_code,
    subscription: s
      ? {
          status: s.status,
          currentPeriodEnd: s.current_period_end,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          planName: s.plan_name,
          periodMonths: s.period_months,
          currency: s.currency,
          amountMinor: s.amount_minor,
        }
      : null,
  };
}

export type BuyablePrice = {
  id: string;
  periodMonths: number;
  currency: string;
  amountMinor: number;
};

/**
 * Plus prices that can actually be bought: active, linked to a Razorpay plan, in the member's
 * currency (by profile country, then visitor country), else USD, else whatever exists.
 */
export async function getBuyablePrices(
  countryCode: string | null,
): Promise<BuyablePrice[]> {
  if (!isRazorpayConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_prices")
    .select(
      "id, period_months, currency, amount_minor, provider, provider_plan_id, active, plans!inner(code, active)",
    )
    .eq("plans.code", "plus")
    .eq("active", true)
    .eq("provider", "razorpay")
    .not("provider_plan_id", "is", null);
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    periodMonths: r.period_months,
    currency: r.currency,
    amountMinor: r.amount_minor,
  }));
  if (!rows.length) return [];
  const visitor = (await headers()).get("x-vercel-ip-country");
  const wanted = currencyForCountry(countryCode ?? visitor);
  for (const c of [wanted, "USD", rows[0].currency]) {
    const match = rows.filter((r) => r.currency === c);
    if (match.length)
      return match.sort((a, b) => a.periodMonths - b.periodMonths);
  }
  return [];
}
