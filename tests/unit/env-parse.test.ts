import { describe, expect, it } from "vitest";
import { cleanValue, isEmail, normalizeUrl } from "@/lib/env-parse";

describe("normalizeUrl", () => {
  it.each([
    ["https://cubdles.app", "https://cubdles.app"],
    ["https://cubdles.app/", "https://cubdles.app"],
    ["cubdles-abc.vercel.app", "https://cubdles-abc.vercel.app"],
    ["  https://cubdles.app  ", "https://cubdles.app"],
    ['"https://cubdles.app"', "https://cubdles.app"],
    ["localhost:3000", "http://localhost:3000"],
    [
      "https://babfmifxyjmesfebzewa.supabase.co",
      "https://babfmifxyjmesfebzewa.supabase.co",
    ],
  ])("%s → %s", (raw, out) => expect(normalizeUrl(raw)).toBe(out));

  it("treats empty as unset and junk as invalid", () => {
    expect(normalizeUrl("")).toBeUndefined();
    expect(normalizeUrl(undefined)).toBeUndefined();
    expect(normalizeUrl("not a url")).toBeNull();
    expect(normalizeUrl("cubdles")).toBeNull();
    expect(normalizeUrl("ftp://cubdles.app")).toBeNull();
  });
});

describe("cleanValue / isEmail", () => {
  it("strips spaces and quotes", () =>
    expect(cleanValue("  'abc' ")).toBe("abc"));
  it("validates emails", () => {
    expect(isEmail("hello@cubdles.app")).toBe(true);
    expect(isEmail("hello cubdles")).toBe(false);
  });
});
