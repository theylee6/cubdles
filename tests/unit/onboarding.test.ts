import { describe, expect, it } from "vitest";
import { nearestCity, distanceKm } from "@/features/onboarding/options";
import {
  affectionSchema,
  ageOn,
  birthdaySchema,
  interestsSchema,
  isRealDate,
  locationSchema,
  lookingForSchema,
  promptsSchema,
  readPromptAnswers,
  basicsSchema,
} from "@/features/onboarding/schemas";
import { STEPS, canVisit, currentStepSlug, nextStepSlug, previousStepSlug, stepNumber } from "@/features/onboarding/steps";
import { ERROR_STEP, dbErrorKey, friendlyDbError } from "@/features/onboarding/errors";

describe("step registry", () => {
  it("has ten steps in order", () => {
    expect(STEPS.map((s) => s.slug)).toEqual(["birthday", "basics", "looking-for", "location", "affection", "interests", "photos", "prompts", "about", "review"]);
  });
  it("resumes at the first unfinished step", () => {
    expect(currentStepSlug(0)).toBe("birthday");
    expect(currentStepSlug(6)).toBe("photos");
    expect(currentStepSlug(99)).toBe("review");
  });
  it("lets members revisit finished steps but not skip ahead", () => {
    expect(canVisit("basics", 3)).toBe(true);
    expect(canVisit("location", 3)).toBe(true); // the current step
    expect(canVisit("affection", 3)).toBe(false);
    expect(canVisit("review", 10)).toBe(true);
  });
  it("knows its neighbours", () => {
    expect(nextStepSlug("birthday")).toBe("basics");
    expect(nextStepSlug("review")).toBeNull();
    expect(previousStepSlug("birthday")).toBeNull();
    expect(stepNumber("review")).toBe(10);
  });
  it("every completion error points at a real step", () => {
    for (const slug of Object.values(ERROR_STEP)) expect(STEPS.some((s) => s.slug === slug)).toBe(true);
  });
});

describe("birthday", () => {
  it("rejects impossible dates that JavaScript would roll over", () => {
    expect(isRealDate("2001-02-30")).toBe(false);
    expect(isRealDate("2000-02-29")).toBe(true);
    expect(isRealDate("2001-02-29")).toBe(false);
  });
  it("computes age correctly around the birthday", () => {
    const today = new Date("2026-11-18T00:00:00Z");
    expect(ageOn(new Date("2008-11-18T00:00:00Z"), today)).toBe(18);
    expect(ageOn(new Date("2008-11-19T00:00:00Z"), today)).toBe(17);
  });
  it("requires consent and a date, but leaves the 18+ decision to the database", () => {
    expect(birthdaySchema.safeParse({ birthDate: "1995-04-02", consent: "on" }).success).toBe(true);
    expect(birthdaySchema.safeParse({ birthDate: "1995-04-02" }).success).toBe(false);
    expect(birthdaySchema.safeParse({ birthDate: "", consent: "on" }).success).toBe(false);
    expect(birthdaySchema.safeParse({ birthDate: "2999-01-01", consent: "on" }).success).toBe(false);
  });
});

describe("basics", () => {
  it("accepts names in any script and turns blanks into null", () => {
    const r = basicsSchema.safeParse({ displayName: " अनन्या ", genderGroup: "woman", genderIdentity: "", pronouns: "" });
    expect(r.success && r.data).toMatchObject({ displayName: "अनन्या", genderIdentity: null, pronouns: null });
  });
  it("rejects links and numbers in names", () => {
    expect(basicsSchema.safeParse({ displayName: "call 98765", genderGroup: "man" }).success).toBe(false);
    expect(basicsSchema.safeParse({ displayName: "www.site.com", genderGroup: "man" }).success).toBe(false);
  });
});

describe("looking for", () => {
  it("needs at least one gender and an ordered age range", () => {
    expect(lookingForSchema.safeParse({ intention: "long_term", showGenders: ["woman"], ageMin: "25", ageMax: "35" }).success).toBe(true);
    expect(lookingForSchema.safeParse({ intention: "long_term", showGenders: [], ageMin: "25", ageMax: "35" }).success).toBe(false);
    expect(lookingForSchema.safeParse({ intention: "long_term", showGenders: ["man"], ageMin: "40", ageMax: "30" }).success).toBe(false);
    expect(lookingForSchema.safeParse({ intention: "long_term", showGenders: ["man"], ageMin: "16", ageMax: "30" }).success).toBe(false);
  });
});

describe("location", () => {
  it("accepts either device coordinates or a known city", () => {
    expect(locationSchema.safeParse({ mode: "device", lat: "12.97", lng: "77.59", distanceKm: "25" }).success).toBe(true);
    expect(locationSchema.safeParse({ mode: "city", city: "Pune", distanceKm: "10" }).success).toBe(true);
    expect(locationSchema.safeParse({ mode: "city", distanceKm: "10" }).success).toBe(false);
    expect(locationSchema.safeParse({ mode: "city", city: "Atlantis", distanceKm: "10" }).success).toBe(false);
    expect(locationSchema.safeParse({ mode: "city", city: "Pune", distanceKm: "7" }).success).toBe(false);
  });
  it("names the nearest launch city, or none when far away", () => {
    expect(nearestCity({ lat: 12.93, lng: 77.62 })?.name).toBe("Bengaluru");
    expect(nearestCity({ lat: 51.5, lng: -0.12 })).toBeNull();
    expect(Math.round(distanceKm({ lat: 19.08, lng: 72.88 }, { lat: 18.52, lng: 73.86 }))).toBeGreaterThan(110);
  });
});

describe("affection", () => {
  it("allows up to two love languages", () => {
    const base = { cuddleStyle: "little_spoon", pace: "slow", touchComfort: "4", loveLanguages: ["touch", "time"] };
    expect(affectionSchema.safeParse(base).success).toBe(true);
    expect(affectionSchema.safeParse({ ...base, loveLanguages: ["touch", "time", "words"] }).success).toBe(false);
    expect(affectionSchema.safeParse({ ...base, touchComfort: "0" }).success).toBe(false);
  });
});

describe("interests", () => {
  it("needs 3–10 interests and treats blank lifestyle answers as not given", () => {
    const r = interestsSchema.safeParse({ interestIds: ["1", "2", "3"], drinking: "", diet: "vegetarian" });
    expect(r.success).toBe(true);
    expect(r.success && (r.data as Record<string, unknown>).drinking).toBeUndefined();
    expect(interestsSchema.safeParse({ interestIds: ["1", "2"] }).success).toBe(false);
    expect(interestsSchema.safeParse({ interestIds: ["1"], diet: "carnivore" }).success).toBe(false);
  });
});

describe("prompts", () => {
  it("reads filled slots from the form and skips empty ones", () => {
    const fd = new FormData();
    fd.set("promptId-0", "3");
    fd.set("answer-0", "Chai.");
    fd.set("promptId-1", "");
    fd.set("answer-1", "  ");
    fd.set("promptId-2", "5");
    fd.set("answer-2", "Rain on the window.");
    expect(readPromptAnswers(fd)).toEqual([
      { promptId: "3", answer: "Chai." },
      { promptId: "5", answer: "Rain on the window." },
    ]);
  });
  it("needs one to three distinct prompts with answers", () => {
    expect(promptsSchema.safeParse({ answers: [] }).success).toBe(false);
    expect(promptsSchema.safeParse({ answers: [{ promptId: "1", answer: "a" }, { promptId: "1", answer: "b" }] }).success).toBe(false);
    expect(promptsSchema.safeParse({ answers: [{ promptId: "1", answer: "" }] }).success).toBe(false);
    expect(promptsSchema.safeParse({ answers: [{ promptId: "1", answer: "x".repeat(201) }] }).success).toBe(false);
  });
});

describe("database error mapping", () => {
  it("turns function exceptions into friendly copy", () => {
    expect(dbErrorKey({ message: "photo_limit_reached" })).toBe("photo_limit_reached");
    expect(friendlyDbError({ message: 'new row violates "x"' })).toMatch(/something went wrong/i);
    expect(friendlyDbError({ message: "prompts_missing" })).toMatch(/at least one prompt/);
  });
});
