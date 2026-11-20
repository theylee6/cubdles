import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let rz: typeof import("@/lib/payments/razorpay");
beforeAll(async () => {
  process.env.RAZORPAY_KEY_ID = "rzp_test_abc";
  process.env.RAZORPAY_KEY_SECRET = "test_secret_value";
  process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_value";
  rz = await import("@/lib/payments/razorpay");
});

describe("razorpay signatures", () => {
  it("accepts a genuine checkout signature and rejects tampering", () => {
    const sig = createHmac("sha256", "test_secret_value").update("pay_1|sub_1").digest("hex");
    expect(rz.verifyCheckoutSignature("pay_1", "sub_1", sig)).toBe(true);
    expect(rz.verifyCheckoutSignature("pay_1", "sub_2", sig)).toBe(false);
    expect(rz.verifyCheckoutSignature("pay_1", "sub_1", "00")).toBe(false);
  });
  it("verifies webhook bodies byte for byte", () => {
    const body = '{"event":"subscription.activated"}';
    const sig = createHmac("sha256", "whsec_value").update(body).digest("hex");
    expect(rz.verifyWebhookSignature(body, sig)).toBe(true);
    expect(rz.verifyWebhookSignature(body + " ", sig)).toBe(false);
    expect(rz.verifyWebhookSignature(body, null)).toBe(false);
  });
  it("maps provider statuses", () => {
    expect(rz.mapStatus("active")).toBe("active");
    expect(rz.mapStatus("paused")).toBe("halted");
    expect(rz.mapStatus("resumed")).toBe("active");
    expect(rz.toIso(1_800_000_000)).toBe("2027-01-15T08:00:00.000Z");
  });
});
