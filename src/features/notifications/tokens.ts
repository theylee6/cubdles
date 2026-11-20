import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env.server";

export type EmailTopic = "matches" | "messages";

function key(): string {
  const k =
    serverEnv.NOTIFY_DISPATCH_SECRET ?? serverEnv.SUPABASE_SERVICE_ROLE_KEY;
  if (!k) throw new Error("no_signing_key");
  return k;
}

/** Signed token for one-click unsubscribe links (no login needed, can't be forged for someone else). */
export function unsubscribeToken(profileId: string, topic: EmailTopic): string {
  return createHmac("sha256", key())
    .update(`unsubscribe:${profileId}:${topic}`)
    .digest("base64url");
}

export function verifyUnsubscribeToken(
  profileId: string,
  topic: string,
  token: string,
): topic is EmailTopic {
  if (topic !== "matches" && topic !== "messages") return false;
  try {
    const expected = Buffer.from(unsubscribeToken(profileId, topic));
    const given = Buffer.from(token);
    return expected.length === given.length && timingSafeEqual(expected, given);
  } catch {
    return false;
  }
}

/** Constant-time check of a bearer secret. */
export function bearerMatches(
  header: string | null,
  ...secrets: (string | undefined)[]
): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  return secrets.some((s) => {
    if (!s) return false;
    const want = Buffer.from(s);
    return want.length === given.length && timingSafeEqual(want, given);
  });
}
