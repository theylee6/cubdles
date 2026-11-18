import { chromium } from "@playwright/test";
const pages = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
for (const [name, vp] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1366, height: 900 }]]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  for (const p of pages) {
    const res = await page.goto("http://localhost:3100" + p, { waitUntil: "networkidle" });
    await page.screenshot({ path: `/tmp/shots/${name}${p.replace(/\//g, "_") || "_home"}.png`, fullPage: true });
    console.log(name, p, res.status(), errors.length ? errors.join(" | ") : "");
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
