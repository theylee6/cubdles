"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const subSchema = z.object({
  endpoint: z.url().startsWith("https://").max(1000),
  keys: z.object({
    p256dh: z.string().min(10).max(200),
    auth: z.string().min(8).max(100),
  }),
});

export async function savePushSubscriptionAction(
  sub: unknown,
  userAgent: string,
): Promise<{ ok: boolean; message?: string }> {
  const p = subSchema.safeParse(sub);
  if (!p.success)
    return {
      ok: false,
      message: "This browser gave us an invalid subscription.",
    };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", {
    p_endpoint: p.data.endpoint,
    p_p256dh: p.data.keys.p256dh,
    p_auth: p.data.keys.auth,
    p_user_agent: userAgent.slice(0, 300),
  });
  if (error)
    return {
      ok: false,
      message: "We couldn't turn on notifications. Please try again.",
    };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<void> {
  if (!z.url().safeParse(endpoint).success) return;
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  revalidatePath("/app/settings");
}

export async function savePushSettingsAction(
  matches: boolean,
  messages: boolean,
): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_push_settings", {
    p_push_matches: matches,
    p_push_messages: messages,
  });
  revalidatePath("/app/settings");
  return { ok: !error };
}
