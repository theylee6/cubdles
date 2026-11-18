import { describe, expect, it } from "vitest";
import { parseSafetyAdvisory } from "@/features/member/safety-advisory-data";

describe("parseSafetyAdvisory", () => {
  it("reads a valid advisory with the country's English name", () => {
    expect(
      parseSafetyAdvisory({
        country_code: "KE",
        advisory: "same_sex_criminalised",
      }),
    ).toEqual({
      kind: "same_sex_criminalised",
      countryCode: "KE",
      countryName: "Kenya",
    });
  });
  it("ignores empty or unknown payloads", () => {
    expect(parseSafetyAdvisory(null)).toBeNull();
    expect(
      parseSafetyAdvisory({ country_code: "KE", advisory: "other" }),
    ).toBeNull();
    expect(
      parseSafetyAdvisory({
        country_code: "kenya",
        advisory: "same_sex_criminalised",
      }),
    ).toBeNull();
  });
});
