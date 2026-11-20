"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import {
  cancelSubscription,
  createSubscription,
  fetchSubscription,
  isRazorpayConfigured,
  mapStatus,
  razorpayKeyId,
  toIso,
  verifyCheckoutSignature,
} from "@/lib/payments/razorpay";
import { createClient, createServiceClient } from "@/lib/supabase/server";

type StartResult =
  | { ok: true; subscriptionId: string; keyId: string; email: string | null }
  | { ok: false; message: string };

/** Creates the Razorpay subscription for one price and records it (status "created": grants nothing yet). */
export async function startCheckoutAction(
  priceId: string,
): Promise<StartResult> {
  if (!z.uuid().safeParse(priceId).success)
    return { ok: false, message: "Choose a plan." };
  if (!isRazorpayConfigured())
    return { ok: false, message: "Payments aren't switched on yet." };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please log in again." };

  const supabase = await createClient();
  const { data: price } = await supabase
    .from("plan_prices")
    .select("id, period_months, provider_plan_id, active, plans!inner(code)")
    .eq("id", priceId)
    .eq("active", true)
    .maybeSingle();
  if (!price?.provider_plan_id)
    return { ok: false, message: "That plan isn't available. Please refresh." };

  const { data: membership } = await supabase.rpc("my_membership");
  if ((membership as { plan_code?: string } | null)?.plan_code === "plus")
    return { ok: false, message: "You already have Cubdles Plus." };

  try {
    const sub = await createSubscription({
      planId: price.provider_plan_id,
      periodMonths: price.period_months,
      notes: { profile_id: user.id, price_id: price.id },
    });
    const { error } = await createServiceClient().rpc("upsert_subscription", {
      p_profile: user.id,
      p_price: price.id,
      p_provider_subscription_id: sub.id,
      p_status: mapStatus(sub.status),
    });
    if (error) throw new Error(`record_failed: ${error.code}`);
    return {
      ok: true,
      subscriptionId: sub.id,
      keyId: razorpayKeyId(),
      email: user.email,
    };
  } catch (e) {
    console.error("start checkout failed", e instanceof Error ? e.message : e);
    return {
      ok: false,
      message: "We couldn't start checkout just now. Please try again.",
    };
  }
}

const confirmSchema = z.object({
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_subscription_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

/** After checkout: verify Razorpay's signature, then read the real status from Razorpay (never trust the browser). */
export async function confirmCheckoutAction(
  input: unknown,
): Promise<{ ok: boolean; message: string }> {
  const p = confirmSchema.safeParse(input);
  if (!p.success)
    return { ok: false, message: "We couldn't confirm that payment." };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please log in again." };
  const {
    razorpay_payment_id: pay,
    razorpay_subscription_id: subId,
    razorpay_signature: sig,
  } = p.data;
  if (!verifyCheckoutSignature(pay, subId, sig))
    return {
      ok: false,
      message:
        "We couldn't verify that payment. If you were charged, contact us and we'll sort it out.",
    };

  const service = createServiceClient();
  const { data: row } = await service
    .from("subscriptions")
    .select("profile_id")
    .eq("provider_subscription_id", subId)
    .maybeSingle();
  if (!row || row.profile_id !== user.id)
    return {
      ok: false,
      message:
        "We couldn't match that payment to your account. Please contact us.",
    };

  try {
    const sub = await fetchSubscription(subId);
    await service.rpc("update_subscription_status", {
      p_provider_subscription_id: subId,
      p_status: mapStatus(sub.status),
      p_current_period_end: toIso(sub.current_end) ?? undefined,
    });
  } catch (e) {
    console.error(
      "confirm checkout fetch failed",
      e instanceof Error ? e.message : e,
    );
    // The webhook will still activate it.
    return {
      ok: true,
      message: "Payment received. Plus will switch on in a moment.",
    };
  }
  revalidatePath("/app", "layout");
  return { ok: true, message: "Welcome to Cubdles Plus!" };
}

/** Cancel at the end of the paid period (no partial refunds; Plus stays until then). */
export async function cancelMembershipAction(): Promise<{
  ok: boolean;
  message: string;
}> {
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please log in again." };
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("provider_subscription_id, status")
    .eq("profile_id", user.id)
    .in("status", ["active", "authenticated", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!sub)
    return { ok: false, message: "You don't have an active membership." };
  try {
    const r = await cancelSubscription(sub.provider_subscription_id, true);
    const { error } = await createServiceClient()
      .from("subscriptions")
      .update({
        status: mapStatus(r.status),
        current_period_end: toIso(r.current_end) ?? undefined,
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_subscription_id", sub.provider_subscription_id);
    if (error) throw new Error(`record_failed: ${error.code}`);
  } catch (e) {
    console.error("cancel failed", e instanceof Error ? e.message : e);
    return {
      ok: false,
      message: "We couldn't cancel just now. Please try again or contact us.",
    };
  }
  revalidatePath("/app/settings");
  return {
    ok: true,
    message:
      "Cancelled. You'll keep Plus until the end of the period you've paid for.",
  };
}
