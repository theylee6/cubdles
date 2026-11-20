import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env.server";
import { createServiceClient } from "@/lib/supabase/server";

export type Limit = { bucket: string; max: number; windowSeconds: number };

export const LIMITS = {
  signUpIp: { bucket: "signup_ip", max: 10, windowSeconds: 3600 },
  signInIp: { bucket: "signin_ip", max: 30, windowSeconds: 900 },
  signInEmail: { bucket: "signin_email", max: 10, windowSeconds: 900 },
  resetIp: { bucket: "reset_ip", max: 10, windowSeconds: 3600 },
  contactIp: { bucket: "contact_ip", max: 5, windowSeconds: 3600 },
  exportUser: { bucket: "export_user", max: 5, windowSeconds: 3600 },
} satisfies Record<string, Limit>;

export function hashKey(value: string): string {
  // Salted with the service key so hashes can't be reversed by guessing IPs elsewhere.
  return createHash("sha256")
    .update(
      `${serverEnv.SUPABASE_SERVICE_ROLE_KEY ?? "local"}:${value.toLowerCase()}`,
    )
    .digest("hex");
}

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * True when the request may go ahead. Fails open (allows) if the limiter itself is unavailable,
 * so an outage never locks everyone out; Supabase Auth has its own limits behind this.
 */
export async function allow(limit: Limit, key: string): Promise<boolean> {
  if (!serverEnv.SUPABASE_SERVICE_ROLE_KEY) return true;
  try {
    const { data, error } = await createServiceClient().rpc("rate_limit_hit", {
      p_bucket: limit.bucket,
      p_key_hash: hashKey(key),
      p_max: limit.max,
      p_window_seconds: limit.windowSeconds,
    });
    if (error) {
      console.error("rate limit check failed", error.code);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("rate limit unavailable", e instanceof Error ? e.message : e);
    return true;
  }
}
