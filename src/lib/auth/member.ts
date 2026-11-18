import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/database.types";
import { requireUser, type SessionUser } from "./session";

export type Member = SessionUser & { status: Enums<"profile_status">; statusReason: string | null; displayName: string | null };

/** The signed-in member's account state, once per request. */
export const getMember = cache(async (next = "/app"): Promise<Member> => {
  const user = await requireUser(next);
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("status, status_reason, display_name").eq("id", user.id).single();
  return { ...user, status: data?.status ?? "onboarding", statusReason: data?.status_reason ?? null, displayName: data?.display_name ?? null };
});

/**
 * Gate for pages that need a finished, usable profile (active or paused).
 * Sends everyone else to the right place: onboarding, restore, or the account status page.
 */
export async function requireActiveMember(next = "/app"): Promise<Member> {
  const m = await getMember(next);
  if (m.status === "onboarding") redirect("/onboarding");
  if (m.status === "deleted") redirect("/app/restore");
  if (m.status !== "active" && m.status !== "paused") redirect("/app/account-status");
  return m;
}
