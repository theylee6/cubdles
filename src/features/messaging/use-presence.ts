"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

const TYPING_SEND_EVERY_MS = 2500;
const TYPING_SHOWN_FOR_MS = 5000;

/**
 * "Online now" and "typing…" for one conversation over a private Realtime channel
 * (only the two people in an active match may join; enforced by database policies).
 * You only appear online if you share your online status; typing is sent only while you type.
 */
export function usePresence({
  matchId,
  meId,
  otherId,
  shareOnline,
  enabled,
}: {
  matchId: string;
  meId: string;
  otherId: string;
  shareOnline: boolean;
  enabled: boolean;
}) {
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const lastSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured()) return;
    const supabase = createClient();
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      channel = supabase.channel(`chat-presence:${matchId}`, {
        config: { private: true, presence: { key: meId } },
      });
      channelRef.current = channel;
      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel?.presenceState() ?? {};
          setOtherOnline(Object.keys(state).includes(otherId));
        })
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if ((payload as { from?: string })?.from !== otherId) return;
          setOtherTyping(true);
          if (typingTimer.current) clearTimeout(typingTimer.current);
          typingTimer.current = setTimeout(
            () => setOtherTyping(false),
            TYPING_SHOWN_FOR_MS,
          );
        })
        .on("broadcast", { event: "stopped" }, ({ payload }) => {
          if ((payload as { from?: string })?.from === otherId)
            setOtherTyping(false);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && shareOnline)
            await channel?.track({ at: Date.now() });
        });
    })();

    return () => {
      cancelled = true;
      if (typingTimer.current) clearTimeout(typingTimer.current);
      channelRef.current = null;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [enabled, matchId, meId, otherId, shareOnline]);

  /** Call on every keystroke; sends at most one event every few seconds. */
  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastSent.current < TYPING_SEND_EVERY_MS) return;
    lastSent.current = now;
    void channelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { from: meId },
    });
  }, [meId]);

  /** Call after sending a message so their "typing…" clears immediately. */
  const notifyStopped = useCallback(() => {
    lastSent.current = 0;
    void channelRef.current?.send({
      type: "broadcast",
      event: "stopped",
      payload: { from: meId },
    });
  }, [meId]);

  return { otherOnline, otherTyping, notifyTyping, notifyStopped };
}
