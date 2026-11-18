import { describe, expect, it } from "vitest";
import { distanceText, lastActiveText, lifestyleText, reasonText, swipeErrorKey, swipeErrorText } from "@/features/discovery/copy";
import { EDIT_SECTIONS, isEditSection } from "@/features/settings/sections";
import { STEPS } from "@/features/onboarding/steps";

describe("compatibility reasons", () => {
  it("turns reason codes into readable copy", () => {
    expect(reasonText({ code: "spoons_fit" })).toBe("Big spoon, meet little spoon");
    expect(reasonText({ code: "same_pace", value: "slow" })).toBe("Same pace: slow & steady");
    expect(reasonText({ code: "shared_interests", count: 1 })).toBe("1 shared interest");
    expect(reasonText({ code: "shared_interests", count: 3 })).toBe("3 shared interests");
    expect(reasonText({ code: "same_intention", value: "long_term" })).toBe("You're both looking for something long-term");
    expect(reasonText({ code: "same_love_language", value: "touch" })).toBe("You both value touch");
  });
  it("ignores unknown codes instead of showing raw values", () => {
    expect(reasonText({ code: "mystery" as never })).toBeNull();
  });
});

describe("privacy-preserving labels", () => {
  it("shows distance only as buckets, in km or miles", () => {
    expect(distanceText("under_5")).toBe("Under 5 km away");
    expect(distanceText("under_5", "mi")).toBe("Under 3 miles away");
    expect(distanceText(null)).toBeNull();
  });
  it("shows activity only as today / this week", () => {
    const now = Date.parse("2026-11-18T12:00:00Z");
    expect(lastActiveText("2026-11-18T09:00:00Z", now)).toBe("Active today");
    expect(lastActiveText("2026-11-14T09:00:00Z", now)).toBe("Active this week");
    expect(lastActiveText("2026-10-01T09:00:00Z", now)).toBeNull();
    expect(lastActiveText(null, now)).toBeNull();
  });
  it("labels lifestyle answers and drops unknown ones", () => {
    expect(lifestyleText("diet", "vegetarian")).toBe("Diet: Vegetarian");
    expect(lifestyleText("diet", null)).toBeNull();
    expect(lifestyleText("unknown", "x")).toBeNull();
  });
});

describe("swipe errors", () => {
  it("maps database exceptions to friendly messages", () => {
    expect(swipeErrorKey('P0001: like_limit_reached')).toBe("like_limit_reached");
    expect(swipeErrorText("like_limit_reached")).toMatch(/today's likes/);
    expect(swipeErrorText(swipeErrorKey("something unexpected"))).toMatch(/something went wrong/i);
  });
});

describe("editable sections", () => {
  it("excludes birthday and review, and every section is a real step", () => {
    expect(isEditSection("birthday")).toBe(false);
    expect(isEditSection("review")).toBe(false);
    expect(isEditSection("photos")).toBe(true);
    for (const s of EDIT_SECTIONS) expect(STEPS.some((x) => x.slug === s.slug)).toBe(true);
  });
});
