import { describe, expect, it } from "vitest";
import { describeEntitlement, perMonthMinor, savingsPercent, toPlan } from "@/lib/plans";
import { formatMoney, safeNextPath } from "@/lib/utils";

describe("safeNextPath (open-redirect protection)", () => {
  it.each([
    ["/app", "/app"],
    ["/app/chats?x=1", "/app/chats?x=1"],
    ["https://evil.example", "/app"],
    ["//evil.example", "/app"],
    ["/\\evil.example", "/app"],
    ["javascript:alert(1)", "/app"],
    [null, "/app"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("formatMoney", () => {
  it("formats whole rupees without decimals", () => {
    expect(formatMoney(49900, "INR")).toBe("₹499");
  });
  it("keeps decimals when needed", () => {
    expect(formatMoney(49950, "INR")).toBe("₹499.50");
  });
});

describe("entitlements", () => {
  it("describes limits, unlimited, included and not included", () => {
    expect(describeEntitlement({ featureKey: "daily_likes", limitValue: 25, period: "day" })).toBe("25 a day");
    expect(describeEntitlement({ featureKey: "daily_likes", limitValue: null, period: "day" })).toBe("Unlimited");
    expect(describeEntitlement({ featureKey: "see_likes", limitValue: null, period: null })).toBe("Included");
    expect(describeEntitlement({ featureKey: "see_likes", limitValue: 0, period: null })).toBeNull();
    expect(describeEntitlement(undefined)).toBeNull();
  });
});

describe("price maths", () => {
  const monthly = { id: "m", periodMonths: 1, currency: "INR", amountMinor: 50000 };
  const six = { id: "s", periodMonths: 6, currency: "INR", amountMinor: 180000 };

  it("computes per-month price", () => {
    expect(perMonthMinor(six)).toBe(30000);
  });
  it("computes savings against the monthly price", () => {
    expect(savingsPercent(six, monthly)).toBe(40);
    expect(savingsPercent(monthly, monthly)).toBeNull();
    expect(savingsPercent(six, undefined)).toBeNull();
  });
});

describe("toPlan", () => {
  it("maps database rows and sorts prices by period", () => {
    const plan = toPlan({
      id: "p",
      code: "plus",
      name: "Cubdles Plus",
      description: null,
      is_free: false,
      sort_order: 1,
      plan_prices: [
        { id: "b", period_months: 6, currency: "INR", amount_minor: 179900 },
        { id: "a", period_months: 1, currency: "INR", amount_minor: 49900 },
      ],
      entitlements: [{ feature_key: "undo", limit_value: null, period: null }],
    });
    expect(plan.prices.map((p) => p.periodMonths)).toEqual([1, 6]);
    expect(plan.entitlements[0]).toEqual({ featureKey: "undo", limitValue: null, period: null });
  });
});
