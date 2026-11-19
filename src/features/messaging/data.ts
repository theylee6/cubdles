import "server-only";
import { getCards } from "@/features/discovery/data";
import type { ProfileCard } from "@/features/discovery/types";
import { createClient } from "@/lib/supabase/server";
import { safeTimeZone } from "./copy";
import type { ConversationSummary, Message } from "./types";

export const PAGE_SIZE = 40;

export async function getMemberTimeZone(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_private")
    .select("timezone")
    .eq("profile_id", userId)
    .maybeSingle();
  return safeTimeZone(data?.timezone);
}

export async function getConversations(): Promise<ConversationSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error || !data) return [];
  const cards = await getCards(
    data.map((c) => c.other_id),
    supabase,
  );
  const byId = new Map(cards.map((c) => [c.id, c]));
  return data.flatMap((c) => {
    const card = byId.get(c.other_id);
    if (!card) return [];
    return [
      {
        matchId: c.match_id,
        otherId: c.other_id,
        name: card.display_name ?? "Someone",
        photoUrl: card.photos[0]?.url ?? null,
        matchedAt: c.matched_at,
        lastMessageAt: c.last_message_at,
        preview: c.last_message_preview,
        lastMine: Boolean(c.last_message_mine),
        unread: c.unread_count,
      },
    ];
  });
}

export async function getUnreadConversationsCount(): Promise<number> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("unread_conversations_count");
  return error ? 0 : (data ?? 0);
}

/** Messages before a point in time (newest PAGE_SIZE), returned oldest first. */
export async function getMessagesPage(
  matchId: string,
  before?: string,
): Promise<{ messages: Message[]; hasMore: boolean }> {
  const supabase = await createClient();
  let q = supabase
    .from("messages")
    .select("id, match_id, sender_id, body, client_id, created_at")
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(PAGE_SIZE + 1);
  if (before) q = q.lt("created_at", before);
  const { data } = await q;
  const rows = data ?? [];
  return {
    messages: rows.slice(0, PAGE_SIZE).reverse(),
    hasMore: rows.length > PAGE_SIZE,
  };
}

export async function getMessagesAfter(
  matchId: string,
  after: string,
): Promise<Message[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, match_id, sender_id, body, client_id, created_at")
    .eq("match_id", matchId)
    .gt("created_at", after)
    .order("created_at", { ascending: true })
    .limit(200);
  return data ?? [];
}

export type Conversation = {
  matchId: string;
  other: ProfileCard;
  messages: Message[];
  hasMore: boolean;
  seenAt: string | null;
};

/** One open conversation the member is part of, or null (ended, blocked, or not theirs). */
export async function getConversation(
  matchId: string,
  userId: string,
): Promise<Conversation | null> {
  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, user_a, user_b, ended_at")
    .eq("id", matchId)
    .maybeSingle();
  if (!match || match.ended_at) return null;
  const otherId = match.user_a === userId ? match.user_b : match.user_a;
  const [[other], page, seen] = await Promise.all([
    getCards([otherId], supabase),
    getMessagesPage(matchId),
    supabase.rpc("conversation_seen_at", { p_match_id: matchId }),
  ]);
  if (!other) return null;
  await supabase.rpc("mark_conversation_read", { p_match_id: matchId });
  return {
    matchId,
    other,
    messages: page.messages,
    hasMore: page.hasMore,
    seenAt: seen.data ?? null,
  };
}
