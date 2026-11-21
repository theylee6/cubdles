import "server-only";
import { FTC_ROMANCE_SCAMS_URL } from "@/features/safety/copy";
import { publicEnv } from "@/lib/env";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import { isPushConfigured, sendPushToMember } from "@/lib/push";
import { createServiceClient } from "@/lib/supabase/server";
import { safeTimeZone } from "@/features/messaging/copy";
import {
  fraudBanEmail,
  matchEmail,
  messageEmail,
  pushPayload,
  type Rendered,
} from "./templates";
import { unsubscribeToken, type EmailTopic } from "./tokens";

type Claimed = {
  id: number;
  kind: "match" | "message" | "fraud_ban";
  channel: "email" | "push";
  profile_id: string;
  email: string;
  recipient_name: string | null;
  other_name: string | null;
  ref_id: string;
  last_contact_at: string | null;
  timezone: string | null;
};

const site = () => publicEnv.NEXT_PUBLIC_SITE_URL;

function unsubscribe(profileId: string, topic: EmailTopic) {
  const qs = new URLSearchParams({
    u: profileId,
    k: topic,
    t: unsubscribeToken(profileId, topic),
  }).toString();
  return {
    page: `${site()}/unsubscribe?${qs}`,
    oneClick: `${site()}/api/unsubscribe?${qs}`,
  };
}

export function render(n: Claimed): {
  email: Rendered;
  headers?: Record<string, string>;
} {
  if (n.kind === "fraud_ban") {
    const contact = publicEnv.NEXT_PUBLIC_SUPPORT_EMAIL ?? `${site()}/contact`;
    return {
      email: fraudBanEmail({
        recipient: n.recipient_name,
        bannedName: n.other_name,
        lastContact: n.last_contact_at,
        timeZone: safeTimeZone(n.timezone),
        safetyUrl: `${site()}/safety`,
        ftcUrl: FTC_ROMANCE_SCAMS_URL,
        contact,
      }),
    };
  }
  const topic: EmailTopic = n.kind === "match" ? "matches" : "messages";
  const u = unsubscribe(n.profile_id, topic);
  const url = `${site()}/app/matches/${n.ref_id}`;
  const email =
    n.kind === "match"
      ? matchEmail({
          recipient: n.recipient_name,
          other: n.other_name,
          url,
          unsubscribeUrl: u.page,
        })
      : messageEmail({
          recipient: n.recipient_name,
          other: n.other_name,
          url,
          unsubscribeUrl: u.page,
        });
  return {
    email,
    headers: {
      "List-Unsubscribe": `<${u.oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  };
}

/** Claims due notifications, sends them (email or push), records each result. */
export async function dispatchNotifications(
  limit = 50,
): Promise<{ sent: number; failed: number; deferred: number }> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.rpc("claim_notifications", {
    p_limit: limit,
  });
  if (error) throw new Error(`claim_failed: ${error.code}`);
  let sent = 0;
  let failed = 0;
  let deferred = 0;
  for (const n of (data ?? []) as Claimed[]) {
    const channelReady =
      n.channel === "email" ? isEmailConfigured() : isPushConfigured();
    if (!channelReady) {
      // This channel isn't set up yet: put it back for later without using up a retry.
      const { data: row } = await supabase
        .from("notification_outbox")
        .select("attempts")
        .eq("id", n.id)
        .single();
      await supabase
        .from("notification_outbox")
        .update({
          claimed_at: null,
          attempts: Math.max(0, (row?.attempts ?? 1) - 1),
          send_after: new Date(Date.now() + 15 * 60_000).toISOString(),
        })
        .eq("id", n.id);
      deferred++;
      continue;
    }
    try {
      if (n.channel === "push") {
        await sendPushToMember(n.profile_id, pushPayload(n));
      } else {
        const { email, headers } = render(n);
        await sendEmail({ to: n.email, ...email, headers });
      }
      await supabase.rpc("complete_notification", { p_id: n.id, p_ok: true });
      sent++;
    } catch (e) {
      failed++;
      const reason = e instanceof Error ? e.message : String(e);
      console.error(
        "notification send failed",
        n.kind,
        n.channel,
        reason.slice(0, 120),
      );
      await supabase.rpc("complete_notification", {
        p_id: n.id,
        p_ok: false,
        p_error: reason,
      });
    }
  }
  return { sent, failed, deferred };
}
