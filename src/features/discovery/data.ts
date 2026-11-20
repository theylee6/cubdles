import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/auth/session";
import { distanceText, lastActiveText } from "./copy";
import type { DiscoverFilters, ProfileCard } from "./types";

const PHOTO_TTL = 60 * 60;

type Client = Awaited<ReturnType<typeof createClient>>;

/** Adds short-lived signed URLs to every photo on the cards (storage RLS decides what may be signed). */
async function withPhotoUrls(
  supabase: Client,
  cards: ProfileCard[],
): Promise<ProfileCard[]> {
  const paths = cards.flatMap((c) => c.photos.map((p) => p.path));
  if (!paths.length) return cards;
  const { data } = await supabase.storage
    .from("profile-photos")
    .createSignedUrls(paths, PHOTO_TTL);
  const urls = new Map((data ?? []).map((d) => [d.path, d.signedUrl]));
  return cards.map((c) => ({
    ...c,
    photos: c.photos.map((p) => ({ ...p, url: urls.get(p.path) ?? null })),
  }));
}

/** The viewer's preferred distance unit (set from their country, km by default). */
async function viewerUnit(sb: Client): Promise<"km" | "mi"> {
  const user = await getSessionUser();
  if (!user) return "km";
  const { data } = await sb
    .from("preferences")
    .select("distance_unit")
    .eq("profile_id", user.id)
    .single();
  return data?.distance_unit === "mi" ? "mi" : "km";
}

/** Full cards for the given ids, in order. Ids the viewer may not see are silently dropped. */
export async function getCards(
  ids: string[],
  supabase?: Client,
): Promise<ProfileCard[]> {
  if (!ids.length) return [];
  const sb = supabase ?? (await createClient());
  const { data, error } = await sb.rpc("profile_cards", {
    p_ids: ids.slice(0, 50),
  });
  if (error) throw new Error(`profile_cards failed: ${error.message}`);
  const now = Date.now();
  const raw = (data ?? []) as unknown as ProfileCard[];
  const [unit, verifiedRes] = await Promise.all([
    viewerUnit(sb),
    sb.rpc("verified_profiles", { p_ids: raw.map((c) => c.id) }),
  ]);
  const verified = new Set(verifiedRes.data ?? []);
  const cards = raw.map((c) => ({
    ...c,
    verified: verified.has(c.id),
    distance_label: distanceText(c.distance, unit),
    last_active_label: lastActiveText(c.last_active_at, now),
    last_active_at: null, // never send exact activity times to the browser
  }));
  return withPhotoUrls(sb, cards);
}

export type DiscoverPage = {
  cards: ProfileCard[];
  nextOffset: number | null;
  error?: string;
};

/** One page of discovery candidates with full cards. */
export async function getDiscoverPage(
  filters: DiscoverFilters = {},
  offset = 0,
  limit = 10,
): Promise<DiscoverPage> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("discover", {
    p_limit: limit,
    p_offset: offset,
    p_filters: filters,
  });
  if (error) return { cards: [], nextOffset: null, error: error.message };
  const ids = (data ?? []).map((r) => r.profile_id);
  const cards = await getCards(ids, supabase);
  return { cards, nextOffset: ids.length === limit ? offset + limit : null };
}

export async function getDailyPicks(): Promise<ProfileCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_daily_picks");
  if (error) return [];
  return getCards(
    (data ?? []).map((r) => r.profile_id),
    supabase,
  );
}

export async function getLikesSummary(): Promise<{
  count: number;
  canSee: boolean;
}> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("likes_received_summary");
  const d = (data ?? {}) as { count?: number; can_see?: boolean };
  return { count: d.count ?? 0, canSee: Boolean(d.can_see) };
}

/** People the member has liked who haven't matched yet. */
export async function getSentLikes(userId: string): Promise<ProfileCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("likes")
    .select("to_id, created_at")
    .eq("from_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const cards = await getCards(
    (data ?? []).map((r) => r.to_id),
    supabase,
  );
  return cards.filter((c) => !c.match_id);
}

/** People who liked the member (only returned by RLS when the plan includes it). */
export async function getReceivedLikes(userId: string): Promise<ProfileCard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("likes")
    .select("from_id, created_at")
    .eq("to_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  const cards = await getCards(
    (data ?? []).map((r) => r.from_id),
    supabase,
  );
  return cards.filter((c) => !c.match_id);
}

export type MatchSummary = {
  matchId: string;
  createdAt: string;
  card: ProfileCard;
};

export async function getMatches(userId: string): Promise<MatchSummary[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, user_a, user_b, created_at")
    .is("ended_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []).map((m) => ({
    matchId: m.id,
    createdAt: m.created_at,
    otherId: m.user_a === userId ? m.user_b : m.user_a,
  }));
  const cards = await getCards(
    rows.map((r) => r.otherId),
    supabase,
  );
  const byId = new Map(cards.map((c) => [c.id, c]));
  return rows.flatMap((r) =>
    byId.has(r.otherId)
      ? [
          {
            matchId: r.matchId,
            createdAt: r.createdAt,
            card: byId.get(r.otherId)!,
          },
        ]
      : [],
  );
}
