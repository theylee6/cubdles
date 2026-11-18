import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES: [string, RegExp][] = [
  ["/", /held than swiped/i],
  ["/how-it-works", /unhurried by design/i],
  ["/about", /affection deserves a place/i],
  ["/pricing", /free to fall for someone/i],
  ["/safety", /warm doesn't mean careless/i],
  ["/faq", /questions, answered/i],
  ["/contact", /love to hear from you/i],
  ["/guidelines", /be kind, be real, ask first/i],
  ["/terms", /terms and conditions/i],
  ["/privacy", /privacy policy/i],
  ["/join", /come on in/i],
  ["/login", /welcome back/i],
];

for (const [path, heading] of PAGES) {
  test(`${path} renders, has one h1 and no accessibility violations`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test("legal pages are clearly marked as drafts", async ({ page }) => {
  for (const path of ["/terms", "/privacy", "/guidelines"]) {
    await page.goto(path);
    await expect(page.getByText("Draft — pending legal review")).toBeVisible();
  }
});

test("header navigation works on every viewport", async ({ page, isMobile }) => {
  await page.goto("/");
  if (isMobile) await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("navigation", { name: isMobile ? "Main mobile" : "Main" }).getByRole("link", { name: "Safety" }).click();
  await expect(page).toHaveURL(/\/safety$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/careless/i);
});

test("unknown pages return a friendly 404", async ({ page }) => {
  const res = await page.goto("/no-such-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: /wandered off/i })).toBeVisible();
});

test("sign-up validates input on the server and explains each problem", async ({ page }) => {
  await page.goto("/join");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Enter a valid email address.")).toBeVisible();
  await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
  await expect(page.getByText("You must be 18 or older to join Cubdles.")).toBeVisible();
  await expect(page.getByText("Please accept the Terms and Privacy Policy.")).toBeVisible();
});

test("protected member area redirects or explains when signed out", async ({ page }) => {
  await page.goto("/app");
  // With Supabase configured the proxy redirects to /login; without it, the page says accounts aren't connected.
  await expect(page.getByText(/welcome back|accounts aren't connected yet/i).first()).toBeVisible();
});

test("pricing never shows hardcoded prices when no plans are configured", async ({ page }) => {
  await page.goto("/pricing");
  const notice = page.getByText("Membership prices aren't published yet");
  const plans = page.getByRole("list", { name: /prices$/ });
  await expect(notice.or(plans.first())).toBeVisible();
});

test("profile set-up requires signing in", async ({ page }) => {
  for (const path of ["/onboarding", "/onboarding/photos"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=%2Fonboarding/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/welcome back/i);
  }
});

test("unknown onboarding steps are 404s", async ({ page }) => {
  const res = await page.goto("/onboarding/not-a-step");
  expect(res?.status()).toBe(404);
});

test("member pages require signing in", async ({ page }) => {
  for (const path of ["/app/discover", "/app/likes", "/app/matches", "/app/me", "/app/me/edit/photos", "/app/settings"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("unknown edit sections are 404s", async ({ page }) => {
  const res = await page.goto("/app/me/edit/birthday");
  expect(res?.status()).toBe(404);
});

test("the purge job refuses requests without the cron secret", async ({ request }) => {
  const res = await request.get("/api/cron/purge-accounts");
  expect(res.status()).toBe(401);
});
