import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

/** Razorpay (RBI-authorised payment aggregator, incl. cross-border). Docs: https://razorpay.com/docs/api/payments/subscriptions/ */
const API = "https://api.razorpay.com/v1";

export function isRazorpayConfigured(): boolean {
  return Boolean(serverEnv.RAZORPAY_KEY_ID && serverEnv.RAZORPAY_KEY_SECRET);
}

export function razorpayKeyId(): string {
  if (!serverEnv.RAZORPAY_KEY_ID) throw new Error("razorpay_not_configured");
  return serverEnv.RAZORPAY_KEY_ID;
}

export type RazorpaySubscription = {
  id: string;
  status: string;
  current_end: number | null;
  ended_at?: number | null;
  plan_id: string;
  notes?: Record<string, string>;
};

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isRazorpayConfigured()) throw new Error("razorpay_not_configured");
  const auth = Buffer.from(
    `${serverEnv.RAZORPAY_KEY_ID}:${serverEnv.RAZORPAY_KEY_SECRET}`,
  ).toString("base64");
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as T & {
    error?: { description?: string; code?: string };
  };
  if (!res.ok)
    throw new Error(
      `razorpay_${res.status}: ${body.error?.code ?? ""} ${body.error?.description ?? ""}`.trim(),
    );
  return body;
}

export function createSubscription(opts: {
  planId: string;
  periodMonths: number;
  notes: Record<string, string>;
}) {
  // Razorpay needs a total number of billing cycles; ~10 years means "until cancelled".
  const totalCount = Math.max(1, Math.floor(120 / opts.periodMonths));
  return call<RazorpaySubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: opts.planId,
      total_count: totalCount,
      customer_notify: 1,
      notes: opts.notes,
    }),
  });
}

export function fetchSubscription(id: string) {
  return call<RazorpaySubscription>(`/subscriptions/${encodeURIComponent(id)}`);
}

export function cancelSubscription(id: string, atCycleEnd: boolean) {
  return call<RazorpaySubscription>(
    `/subscriptions/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ cancel_at_cycle_end: atCycleEnd ? 1 : 0 }),
    },
  );
}

function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Checkout success: signature = HMAC_SHA256(payment_id + "|" + subscription_id, key_secret). */
export function verifyCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string,
): boolean {
  if (!serverEnv.RAZORPAY_KEY_SECRET) return false;
  const expected = createHmac("sha256", serverEnv.RAZORPAY_KEY_SECRET)
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhooks: X-Razorpay-Signature = HMAC_SHA256(raw body, webhook secret). */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret = serverEnv.RAZORPAY_WEBHOOK_SECRET,
): boolean {
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

type DbStatus =
  | "created"
  | "authenticated"
  | "active"
  | "pending"
  | "halted"
  | "cancelled"
  | "completed"
  | "expired";

/** Razorpay subscription status → ours. Paused counts as halted (no access while paused). */
export function mapStatus(s: string): DbStatus {
  switch (s) {
    case "created":
    case "authenticated":
    case "active":
    case "pending":
    case "halted":
    case "cancelled":
    case "completed":
    case "expired":
      return s;
    case "paused":
      return "halted";
    case "resumed":
      return "active";
    default:
      return "pending";
  }
}

export const toIso = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toISOString() : null;
