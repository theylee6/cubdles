import { describe, expect, it } from "vitest";
import {
  FRAUD_BAN_ADVICE,
  REPORT_REASONS,
  reasonLabel,
  reportErrorKey,
  reportErrorText,
  warningText,
} from "@/features/safety/copy";

describe("report reasons", () => {
  it("match the database enum exactly", () => {
    expect(REPORT_REASONS.map((r) => r.value)).toEqual([
      "fake_profile",
      "scam",
      "harassment",
      "inappropriate_content",
      "hate",
      "underage",
      "offline_safety",
      "spam",
      "other",
    ]);
  });
  it("have labels", () => {
    expect(reasonLabel("scam")).toMatch(/money/i);
    expect(reasonLabel(null)).toBe("Something else");
  });
});

describe("errors", () => {
  it("maps database errors", () => {
    expect(reportErrorKey("P0001: rate_limited")).toBe("rate_limited");
    expect(reportErrorText("details_required")).toMatch(/what happened/i);
    expect(reportErrorText("unknown")).toMatch(/couldn't send/i);
  });
});

describe("member-facing safety text", () => {
  it("warnings never name the reporter and point at the guidelines", () => {
    const t = warningText("harassment");
    expect(t).toMatch(/uncomfortable/);
    expect(t).toMatch(/guidelines/);
  });
  it("fraud-ban notice covers what 15 U.S.C. 45g requires", () => {
    expect(FRAUD_BAN_ADVICE.identity).toMatch(/false identity/i);
    expect(FRAUD_BAN_ADVICE.money).toMatch(/never send money/i);
    expect(FRAUD_BAN_ADVICE.money).toMatch(/financial details/i);
  });
});
