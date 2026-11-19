"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/client";

/** Re-renders the current page when a new message arrives in any of the member's conversations. */
export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    const channel = supabase.channel("inbox-list");
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session)
        await supabase.realtime.setAuth(data.session.access_token);
      channel
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "messages" },
          refresh,
        )
        .subscribe();
    })();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [router]);
  return null;
}
