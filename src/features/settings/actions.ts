"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/lib/auth/schemas";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

async function ctx() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/app/settings");
  return { user, supabase: await createClient() };
}

const privacySchema = z.object({
  show_online_status: z.boolean(),
  show_last_active: z.boolean(),
  send_read_receipts: z.boolean(),
  hide_age: z.boolean(),
  hide_distance: z.boolean(),
});

export async function savePrivacy(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { user, supabase } = await ctx();
  const values = privacySchema.parse(
    Object.fromEntries(
      Object.keys(privacySchema.shape).map((k) => [
        k,
        formData.get(k) === "on",
      ]),
    ),
  );
  const { error } = await supabase
    .from("privacy_settings")
    .update(values)
    .eq("profile_id", user.id);
  if (error)
    return { ok: false, message: "We couldn't save that. Please try again." };
  revalidatePath("/app/settings");
  return { ok: true, message: "Privacy settings saved." };
}

export async function saveEmailSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_notification_settings", {
    p_email_matches: formData.get("email_matches") === "on",
    p_email_messages: formData.get("email_messages") === "on",
  });
  if (error)
    return { ok: false, message: "We couldn't save that. Please try again." };
  revalidatePath("/app/settings");
  return { ok: true, message: "Email settings saved." };
}

export async function setPaused(paused: boolean): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_paused", { p_paused: paused });
  if (error) return { ok: false, message: "We couldn't change that just now." };
  revalidatePath("/app", "layout");
  return {
    ok: true,
    message: paused
      ? "Your profile is paused."
      : "Welcome back — you're visible again.",
  };
}

export async function setIncognito(on: boolean): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("set_incognito", { p_on: on });
  if (error) {
    return {
      ok: false,
      message: error.message.includes("premium_required")
        ? "Incognito comes with Cubdles Plus."
        : "We couldn't change that just now.",
    };
  }
  revalidatePath("/app/settings");
  return { ok: true, message: on ? "Incognito is on." : "Incognito is off." };
}

/** Requires typing DELETE. Hides the profile now; purged after 30 days unless restored. */
export async function requestDeletion(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (
    String(formData.get("confirm") ?? "")
      .trim()
      .toUpperCase() !== "DELETE"
  ) {
    return { ok: false, errors: { confirm: "Type DELETE to confirm." } };
  }
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("request_account_deletion");
  if (error)
    return {
      ok: false,
      message: "We couldn't delete your account just now. Please contact us.",
    };
  redirect("/app/restore?requested=1");
}

export async function restoreAccount(): Promise<FormState> {
  const { supabase } = await ctx();
  const { error } = await supabase.rpc("restore_account");
  if (error)
    return {
      ok: false,
      message:
        "This account can't be restored. Please contact us if you think that's wrong.",
    };
  redirect("/app");
}
