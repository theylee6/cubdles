"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { MAX_MESSAGE_LENGTH, messageErrorKey, messageErrorText } from "./copy";
import {
  getMessagesAfter,
  getMessagesPage,
  getUnreadConversationsCount,
} from "./data";
import type { Message, SendResult } from "./types";

const uuid = z.uuid();
const iso = z.iso.datetime({ offset: true });

export async function sendMessageAction(
  matchId: string,
  body: string,
  clientId: string,
): Promise<SendResult> {
  if (
    !uuid.safeParse(matchId).success ||
    !uuid.safeParse(clientId).success ||
    typeof body !== "string"
  ) {
    return { ok: false, code: "invalid", message: messageErrorText("invalid") };
  }
  if (!body.trim())
    return {
      ok: false,
      code: "empty_message",
      message: messageErrorText("empty_message"),
    };
  if (body.length > MAX_MESSAGE_LENGTH * 2)
    return {
      ok: false,
      code: "message_too_long",
      message: messageErrorText("message_too_long"),
    };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_message", {
    p_match_id: matchId,
    p_body: body,
    p_client_id: clientId,
  });
  if (error || !data) {
    const code = messageErrorKey(error?.message);
    if (code === "unknown") console.error("send_message failed", error?.code);
    return { ok: false, code, message: messageErrorText(code) };
  }
  return { ok: true, message: data };
}

export async function loadEarlierAction(
  matchId: string,
  before: string,
): Promise<{ messages: Message[]; hasMore: boolean }> {
  if (!uuid.safeParse(matchId).success || !iso.safeParse(before).success)
    return { messages: [], hasMore: false };
  return getMessagesPage(matchId, before);
}

/** Catch-up when the live connection dropped or the tab was in the background. */
export async function loadNewerAction(
  matchId: string,
  after: string,
): Promise<{ messages: Message[]; seenAt: string | null }> {
  if (!uuid.safeParse(matchId).success || !iso.safeParse(after).success)
    return { messages: [], seenAt: null };
  const supabase = await createClient();
  const [messages, seen] = await Promise.all([
    getMessagesAfter(matchId, after),
    supabase.rpc("conversation_seen_at", { p_match_id: matchId }),
  ]);
  return { messages, seenAt: seen.data ?? null };
}

export async function markReadAction(matchId: string): Promise<void> {
  if (!uuid.safeParse(matchId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { p_match_id: matchId });
}

export async function unreadCountAction(): Promise<number> {
  return getUnreadConversationsCount();
}
