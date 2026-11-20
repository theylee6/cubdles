import { NextResponse, type NextRequest } from "next/server";
import {
  mapStatus,
  toIso,
  verifyWebhookSignature,
} from "@/lib/payments/razorpay";
import { createServiceClient } from "@/lib/supabase/server";

type Payload = {
  event?: string;
  payload?: {
    subscription?: {
      entity?: {
        id?: string;
        status?: string;
        current_end?: number | null;
        notes?: Record<string, string>;
      };
    };
  };
};

/**
 * Razorpay webhooks (configure in the Razorpay dashboard with the subscription.* events).
 * Verified with the webhook secret; each event is processed once (x-razorpay-event-id).
 */
export async function POST(request: NextRequest) {
  const raw = await request.text();
  if (
    !verifyWebhookSignature(raw, request.headers.get("x-razorpay-signature"))
  ) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }
  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const eventId =
    request.headers.get("x-razorpay-event-id") ??
    `${body.event}:${body.payload?.subscription?.entity?.id}:${Date.now()}`;
  const supabase = createServiceClient();

  // Idempotency: a duplicate delivery hits the primary key and is acknowledged without reprocessing.
  const { error: dupError } = await supabase
    .from("payment_events")
    .insert({
      provider_event_id: eventId.slice(0, 100),
      event_type: (body.event ?? "unknown").slice(0, 80),
      payload: body as never,
    });
  if (dupError) {
    if (dupError.code === "23505")
      return NextResponse.json({ ok: true, duplicate: true });
    console.error("payment_events insert failed", dupError.code);
    return NextResponse.json({ error: "store_failed" }, { status: 500 });
  }

  const sub = body.payload?.subscription?.entity;
  if (body.event?.startsWith("subscription.") && sub?.id && sub.status) {
    const { data: updated, error } = await supabase.rpc(
      "update_subscription_status",
      {
        p_provider_subscription_id: sub.id,
        p_status: mapStatus(sub.status),
        p_current_period_end: toIso(sub.current_end),
      },
    );
    if (error) {
      console.error("subscription update failed", error.code);
      // Let Razorpay's retry process it again.
      await supabase
        .from("payment_events")
        .delete()
        .eq("provider_event_id", eventId.slice(0, 100));
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    // A subscription we didn't create (e.g. made in the dashboard) but tagged with a member and price.
    if (!updated && sub.notes?.profile_id && sub.notes?.price_id) {
      await supabase.rpc("upsert_subscription", {
        p_profile: sub.notes.profile_id,
        p_price: sub.notes.price_id,
        p_provider_subscription_id: sub.id,
        p_status: mapStatus(sub.status),
        p_current_period_end: toIso(sub.current_end),
      });
    }
  }
  return NextResponse.json({ ok: true });
}
