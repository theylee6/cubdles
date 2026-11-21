import "server-only";
import webpush from "web-push";
import { publicEnv } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";
import { createServiceClient } from "@/lib/supabase/server";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export function isPushConfigured(): boolean {
  return Boolean(
    publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY && serverEnv.VAPID_PRIVATE_KEY,
  );
}

let configured = false;
function setup() {
  if (configured) return;
  webpush.setVapidDetails(
    serverEnv.VAPID_SUBJECT,
    publicEnv.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    serverEnv.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

/** Sends to every device of one member. Dead endpoints (404/410) are removed. Returns devices reached. */
export async function sendPushToMember(
  profileId: string,
  payload: PushPayload,
): Promise<number> {
  if (!isPushConfigured()) throw new Error("push_not_configured");
  setup();
  const supabase = createServiceClient();
  const { data: targets, error } = await supabase.rpc("push_targets", {
    p_profile: profileId,
  });
  if (error) throw new Error(`push_targets_failed: ${error.code}`);
  let reached = 0;
  for (const t of targets ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12, urgency: "normal" },
      );
      reached++;
      await supabase.rpc("push_result", { p_id: t.id, p_ok: true });
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      await supabase.rpc("push_result", {
        p_id: t.id,
        p_ok: false,
        p_gone: status === 404 || status === 410,
      });
    }
  }
  return reached;
}
