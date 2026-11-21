import "server-only";
import {
  cancelSubscription,
  isRazorpayConfigured,
  mapStatus,
  toIso,
} from "@/lib/payments/razorpay";
import { createServiceClient } from "@/lib/supabase/server";

/** Statuses in which Razorpay may still charge the member. */
const CHARGEABLE = ["authenticated", "active", "pending", "halted"] as const;

/**
 * Stops future charges for a member (used when they delete their account).
 * Subscriptions already set to end with the period are left alone.
 * Returns false if a chargeable subscription could not be cancelled, so the caller
 * never removes the account (and its billing records) while Razorpay can still charge it.
 */
export async function stopRenewals(profileId: string): Promise<boolean> {
  const admin = createServiceClient();
  const { data: subs, error } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("profile_id", profileId)
    .eq("cancel_at_period_end", false)
    .in("status", [...CHARGEABLE]);
  if (error) {
    console.error("stopRenewals: lookup failed", error.code);
    return false;
  }
  if (!subs?.length) return true;
  if (!isRazorpayConfigured()) return false;

  let ok = true;
  for (const { provider_subscription_id: id } of subs) {
    try {
      const r = await cancelSubscription(id, true);
      const { error: upError } = await admin
        .from("subscriptions")
        .update({
          status: mapStatus(r.status),
          current_period_end: toIso(r.current_end) ?? undefined,
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq("provider_subscription_id", id);
      if (upError) throw new Error(`record_failed: ${upError.code}`);
    } catch (e) {
      ok = false;
      console.error(
        "stopRenewals: cancel failed",
        e instanceof Error ? e.message : e,
      );
    }
  }
  return ok;
}
