import { describe, expect, it } from "vitest";
import { contactSchema, newPasswordSchema, signUpSchema } from "@/lib/auth/schemas";

describe("signUpSchema", () => {
  const valid = { email: "  Asha@Example.com ", password: "cozy-blanket-42", adult: "on", terms: "on" };

  it("accepts a valid sign-up and normalises the email", () => {
    const r = signUpSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.success && r.data.email).toBe("asha@example.com");
  });

  it("requires the 18+ confirmation", () => {
    const r = signUpSchema.safeParse({ ...valid, adult: undefined });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["adult"]);
  });

  it("requires accepting the terms", () => {
    expect(signUpSchema.safeParse({ ...valid, terms: undefined }).success).toBe(false);
  });

  it.each([
    ["short1", "too short"],
    ["onlyletters-long", "no number"],
    ["1234567890", "no letter"],
  ])("rejects weak password %s (%s)", (password) => {
    expect(signUpSchema.safeParse({ ...valid, password }).success).toBe(false);
  });

  it("rejects an invalid email", () => {
    expect(signUpSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("requires matching passwords", () => {
    const r = newPasswordSchema.safeParse({ password: "cozy-blanket-42", confirm: "cozy-blanket-43" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["confirm"]);
  });
});

describe("contactSchema", () => {
  const valid = { name: "Ravi", email: "ravi@example.com", topic: "general", message: "Hello, a quick question.", website: "" };

  it("accepts a valid message", () => {
    expect(contactSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects when the bot honeypot is filled", () => {
    expect(contactSchema.safeParse({ ...valid, website: "http://spam.example" }).success).toBe(false);
  });

  it("rejects unknown topics", () => {
    expect(contactSchema.safeParse({ ...valid, topic: "other" }).success).toBe(false);
  });
});
