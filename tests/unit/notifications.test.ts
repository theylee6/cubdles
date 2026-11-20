import { describe, expect, it } from "vitest";
import { fraudBanEmail, matchEmail, messageEmail } from "@/features/notifications/templates";

describe("email templates", () => {
  it("match email names the match and offers an unsubscribe link", () => {
    const e = matchEmail({ recipient: "Wen", other: "Xav", url: "https://cubdles.com/app/matches/1", unsubscribeUrl: "https://cubdles.com/unsubscribe?x" });
    expect(e.subject).toBe("You matched with Xav on Cubdles");
    expect(e.html).toContain("https://cubdles.com/unsubscribe?x");
    expect(e.text).toContain("Turn off match emails");
  });
  it("message emails never include message content", () => {
    const e = messageEmail({ recipient: "Wen", other: "Xav", url: "u", unsubscribeUrl: "x" });
    expect(e.subject).toBe("Xav sent you a message");
    expect(e.text).not.toMatch(/said|wrote:/);
  });
  it("escapes names in HTML", () => {
    const e = matchEmail({ recipient: "<b>", other: "<script>alert(1)</script>", url: "u", unsubscribeUrl: "x" });
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });
  it("fraud-ban email carries every item 15 U.S.C. 45g requires", () => {
    const e = fraudBanEmail({
      recipient: "Rhea",
      bannedName: "Sam",
      lastContact: "2026-11-20T10:00:00Z",
      timeZone: "Asia/Kolkata",
      safetyUrl: "https://cubdles.com/safety",
      ftcUrl: "https://consumer.ftc.gov/articles/what-know-about-romance-scams",
      contact: "help@cubdles.com",
    });
    expect(e.text).toContain("Sam"); // who
    expect(e.text).toMatch(/20 November 2026 at 15:30/); // when, in the member's time zone
    expect(e.text).toMatch(/false identity/i);
    expect(e.text).toMatch(/never send money/i);
    expect(e.text).toContain("consumer.ftc.gov");
    expect(e.text).toContain("help@cubdles.com");
  });
});
