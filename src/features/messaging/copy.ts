/** Wording and formatting for messaging. Pure functions: safe on server and client, unit-tested. */

export const MAX_MESSAGE_LENGTH = 2000;

const ERRORS: Record<string, string> = {
  conversation_closed: "This conversation has ended.",
  recipient_unavailable:
    "They're not on Cubdles right now, so messages can't be delivered.",
  empty_message: "Write something first.",
  message_too_long: `Messages can be up to ${MAX_MESSAGE_LENGTH.toLocaleString("en")} characters.`,
  rate_limited:
    "You're sending messages very quickly. Take a breath and try again in a minute.",
  not_allowed: "Your account can't send messages right now.",
  not_authenticated: "Please log in again.",
};

export function messageErrorKey(raw: string | undefined | null): string {
  const text = raw ?? "";
  return Object.keys(ERRORS).find((k) => text.includes(k)) ?? "unknown";
}

export function messageErrorText(code: string): string {
  return ERRORS[code] ?? "We couldn't send that just now. Please try again.";
}

function dayKey(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "Today", "Yesterday", "Mon 12 Nov" or "12 Nov 2025", in the member's own time zone. */
export function dayLabel(
  iso: string,
  nowIso: string,
  timeZone: string,
): string {
  const d = new Date(iso);
  const now = new Date(nowIso);
  const key = dayKey(d, timeZone);
  if (key === dayKey(now, timeZone)) return "Today";
  if (key === dayKey(new Date(now.getTime() - 86_400_000), timeZone))
    return "Yesterday";
  const sameYear = key.slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: sameYear ? "short" : undefined,
    day: "numeric",
    month: "short",
    year: sameYear ? undefined : "numeric",
  }).format(d);
}

export function timeLabel(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Short label for the conversation list: a time today, otherwise a day. */
export function listTimeLabel(
  iso: string,
  nowIso: string,
  timeZone: string,
): string {
  const label = dayLabel(iso, nowIso, timeZone);
  return label === "Today" ? timeLabel(iso, timeZone) : label;
}

/** Messages grouped under day headings, oldest first. */
export function groupByDay<T extends { created_at: string }>(
  messages: T[],
  nowIso: string,
  timeZone: string,
) {
  const groups: { label: string; items: T[] }[] = [];
  for (const m of messages) {
    const label = dayLabel(m.created_at, nowIso, timeZone);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(m);
    else groups.push({ label, items: [m] });
  }
  return groups;
}

/** Valid IANA time zone, or UTC. */
export function safeTimeZone(tz: string | null | undefined): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

/**
 * Realtime delivers Postgres' text form ("2026-11-19 21:54:05.13+00"); the API returns ISO 8601.
 * Normalise to ISO so sorting, parsing and later queries agree.
 */
export function normalizeTimestamp(ts: string): string {
  let s = ts.trim().replace(/^(\d{4}-\d{2}-\d{2}) /, "$1T");
  if (/[+-]\d{2}$/.test(s)) s += ":00";
  else if (/[+-]\d{4}$/.test(s)) s = `${s.slice(0, -2)}:${s.slice(-2)}`;
  return s;
}

/** Adds or replaces messages by id / client id and keeps them in time order. */
export function mergeMessages<
  T extends { id: string; client_id: string; created_at: string },
>(current: T[], incoming: T[]): T[] {
  const out = [...current];
  for (const m of incoming) {
    const i = out.findIndex(
      (x) => x.id === m.id || x.client_id === m.client_id,
    );
    if (i >= 0) out[i] = m;
    else out.push(m);
  }
  return out.sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  );
}
