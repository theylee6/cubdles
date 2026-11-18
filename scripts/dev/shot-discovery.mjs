import { chromium } from "@playwright/test";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
for (const [name, vp] of [["mobile", { width: 390, height: 844 }], ["desktop", { width: 1280, height: 900 }]]) {
  const c = await b.newContext({ viewport: vp });
  const p = await c.newPage();
  await p.goto("http://localhost:3102/dev/discovery", { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `/tmp/shots/discovery-${name}.png`, fullPage: true });
  console.log(name, "ok");
}
await b.close();
