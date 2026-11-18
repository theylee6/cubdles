import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const c = await b.newContext(); const p = await c.newPage(); await p.goto("http://localhost:3100/");
const r = await new AxeBuilder({ page: p }).withTags(["wcag2aa"]).analyze();
for (const v of r.violations) for (const n of v.nodes) console.log(n.html.slice(0,140), "|", n.any[0]?.message);
await b.close();
