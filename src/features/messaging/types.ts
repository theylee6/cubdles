export type Message = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  client_id: string;
  created_at: string;
};

/** A message as the chat screen holds it: confirmed by the server, or still on its way. */
export type ChatMessage = Message & { status: "sent" | "sending" | "failed" };

export type ConversationSummary = {
  matchId: string;
  otherId: string;
  name: string;
  photoUrl: string | null;
  matchedAt: string;
  lastMessageAt: string | null;
  preview: string | null;
  lastMine: boolean;
  unread: number;
};

export type SendResult =
  { ok: true; message: Message } | { ok: false; code: string; message: string };
