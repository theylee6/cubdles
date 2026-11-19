import { describe, expect, it } from "vitest";
import {
  dayLabel,
  groupByDay,
  listTimeLabel,
  mergeMessages,
  messageErrorKey,
  messageErrorText,
  normalizeTimestamp,
  safeTimeZone,
  timeLabel,
} from "@/features/messaging/copy";

const NOW = "2026-11-20T10:00:00.000Z"; // 15:30 in India

describe("time labels", () => {
  it("uses the member's time zone for today / yesterday", () => {
    expect(dayLabel("2026-11-20T09:00:00Z", NOW, "Asia/Kolkata")).toBe("Today");
    // 19:00 UTC on the 19th is already the 20th in India…
    expect(dayLabel("2026-11-19T19:00:00Z", NOW, "Asia/Kolkata")).toBe("Today");
    // …but still the 19th in New York.
    expect(dayLabel("2026-11-19T19:00:00Z", NOW, "America/New_York")).toBe(
      "Yesterday",
    );
  });
  it("names older days, with the year only when it differs", () => {
    expect(dayLabel("2026-11-12T10:00:00Z", NOW, "UTC")).toBe("Thu 12 Nov");
    expect(dayLabel("2025-12-31T10:00:00Z", NOW, "UTC")).toBe("31 Dec 2025");
  });
  it("formats times and list labels", () => {
    expect(timeLabel("2026-11-20T09:05:00Z", "Asia/Kolkata")).toBe("14:35");
    expect(listTimeLabel("2026-11-20T09:05:00Z", NOW, "Asia/Kolkata")).toBe(
      "14:35",
    );
    expect(listTimeLabel("2026-11-18T09:05:00Z", NOW, "Asia/Kolkata")).toBe(
      "Wed 18 Nov",
    );
  });
  it("falls back to UTC for unknown zones", () => {
    expect(safeTimeZone("Mars/Olympus")).toBe("UTC");
    expect(safeTimeZone(null)).toBe("UTC");
    expect(safeTimeZone("Europe/Berlin")).toBe("Europe/Berlin");
  });
});

describe("normalizeTimestamp", () => {
  it("turns Postgres text timestamps into ISO 8601", () => {
    expect(normalizeTimestamp("2026-11-19 21:54:05.133848+00")).toBe(
      "2026-11-19T21:54:05.133848+00:00",
    );
    expect(normalizeTimestamp("2026-11-19 21:54:05+0530")).toBe(
      "2026-11-19T21:54:05+05:30",
    );
    expect(normalizeTimestamp("2026-11-19T21:54:05.1+00:00")).toBe(
      "2026-11-19T21:54:05.1+00:00",
    );
    expect(
      Number.isNaN(
        Date.parse(normalizeTimestamp("2026-11-19 21:54:05.133848+00")),
      ),
    ).toBe(false);
  });
});

describe("mergeMessages", () => {
  const m = (id: string, client_id: string, created_at: string) => ({
    id,
    client_id,
    created_at,
  });
  it("replaces an optimistic message with the server copy (by client id) and keeps order", () => {
    const merged = mergeMessages(
      [
        m("a", "ca", "2026-11-20T09:00:00Z"),
        m("local-cb", "cb", "2026-11-20T09:10:00Z"),
      ],
      [
        m("b", "cb", "2026-11-20T09:05:00Z"),
        m("c", "cc", "2026-11-20T09:01:00Z"),
      ],
    );
    expect(merged.map((x) => x.id)).toEqual(["a", "c", "b"]);
  });
  it("ignores duplicates delivered twice (realtime + catch-up)", () => {
    const one = m("a", "ca", "2026-11-20T09:00:00Z");
    expect(mergeMessages([one], [one, one])).toHaveLength(1);
  });
  it("orders mixed timestamp formats correctly", () => {
    const merged = mergeMessages(
      [m("x", "cx", "2026-11-20T09:00:00.500+00:00")],
      [m("y", "cy", normalizeTimestamp("2026-11-20 09:00:00.2+00"))],
    );
    expect(merged.map((x) => x.id)).toEqual(["y", "x"]);
  });
});

describe("groupByDay", () => {
  it("groups consecutive messages under day labels", () => {
    const groups = groupByDay(
      [
        { created_at: "2026-11-19T08:00:00Z" },
        { created_at: "2026-11-19T09:00:00Z" },
        { created_at: "2026-11-20T08:00:00Z" },
      ],
      NOW,
      "UTC",
    );
    expect(groups.map((g) => [g.label, g.items.length])).toEqual([
      ["Yesterday", 2],
      ["Today", 1],
    ]);
  });
});

describe("errors", () => {
  it("maps database errors to friendly text", () => {
    expect(messageErrorKey("P0001: conversation_closed")).toBe(
      "conversation_closed",
    );
    expect(messageErrorText("rate_limited")).toMatch(/take a breath/i);
    expect(messageErrorText(messageErrorKey("weird"))).toMatch(
      /couldn't send/i,
    );
  });
});
