"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { swipeErrorKey, swipeErrorText } from "./copy";
import { getDiscoverPage, type DiscoverPage } from "./data";
import type { DiscoverFilters, SwipeAction, SwipeResult } from "./types";

const uuid = z.uuid();

const filtersSchema = z
  .object({
    intentions: z.array(z.string().max(40)).max(10).optional(),
    interest_ids: z.array(z.string().regex(/^\d+$/)).max(20).optional(),
    cuddle_styles: z.array(z.string().max(20)).max(4).optional(),
    paces: z.array(z.string().max(20)).max(3).optional(),
    recently_active_days: z.number().int().min(1).max(30).optional(),
  })
  .strict();

/** Like, super like or pass. All rules (quotas, eligibility, matching) are enforced in the database. */
export async function swipeAction(targetId: string, action: SwipeAction): Promise<SwipeResult> {
  if (!uuid.safeParse(targetId).success || !["like", "super", "pass"].includes(action)) {
    return { ok: false, code: "invalid", message: "That didn't work. Please try again." };
  }
  const user = await getSessionUser();
  if (!user) return { ok: false, code: "signed_out", message: "Please log in again." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("swipe", { p_target: targetId, p_action: action });
  if (error) {
    const code = swipeErrorKey(error.message);
    return { ok: false, code, message: swipeErrorText(code) };
  }
  const r = (data ?? {}) as { matched?: boolean; match_id?: string | null };
  if (r.matched) revalidatePath("/app/matches");
  return { ok: true, matched: Boolean(r.matched), matchId: r.match_id ?? null };
}

/** Next page of candidates for the swipe deck or browse grid. */
export async function loadDiscoverPage(filters: DiscoverFilters, offset: number): Promise<DiscoverPage> {
  const user = await getSessionUser();
  if (!user) return { cards: [], nextOffset: null, error: "signed_out" };
  const parsed = filtersSchema.safeParse(filters ?? {});
  if (!parsed.success || !Number.isInteger(offset) || offset < 0 || offset > 5000) {
    return { cards: [], nextOffset: null, error: "invalid_filters" };
  }
  const page = await getDiscoverPage(parsed.data, offset);
  if (page.error) {
    const code = swipeErrorKey(page.error);
    return { ...page, error: code === "unknown" ? "Something went wrong loading people." : swipeErrorText(code) };
  }
  return page;
}

export async function unmatchAction(matchId: string): Promise<{ ok: boolean; message?: string }> {
  if (!uuid.safeParse(matchId).success) return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unmatch", { p_match_id: matchId });
  if (error) return { ok: false, message: swipeErrorText(swipeErrorKey(error.message)) };
  revalidatePath("/app/matches");
  return { ok: true };
}

/** Block someone: hides you from each other everywhere and ends any match (DB trigger). */
export async function blockAction(targetId: string): Promise<{ ok: boolean; message?: string }> {
  if (!uuid.safeParse(targetId).success) return { ok: false, message: "That didn't work." };
  const user = await getSessionUser();
  if (!user) return { ok: false, message: "Please log in again." };
  if (user.id === targetId) return { ok: false, message: "That didn't work." };
  const supabase = await createClient();
  const { error } = await supabase.from("blocks").insert({ blocker_id: user.id, blocked_id: targetId });
  if (error && error.code !== "23505") return { ok: false, message: "We couldn't block them just now. Please try again." };
  revalidatePath("/app", "layout");
  return { ok: true };
}
