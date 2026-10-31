// Visual QA: screenshot every route in light and dark, and report console errors.
// Usage: node scripts/qa-screenshots.mjs [baseUrl] [routes,comma,separated] [width] [themes]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3100";
const routes = (process.argv[3] ?? "/,/scope,/evidence,/interviews,/process,/scoring,/compare,/opportunities,/roadmap,/synthesis").split(",");
const width = Number(process.argv[4] ?? 1440);
const themes = (process.argv[5] ?? "light,dark").split(",");
const out = "qa-screenshots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
let errors = 0;
for (const theme of themes) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1 });
  await ctx.addInitScript((t) => localStorage.setItem("theme", t), theme);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    if (m.type() === "error") {
      errors++;
      console.log(`[console.error] ${theme} ${page.url()} :: ${m.text().slice(0, 300)}`);
    }
  });
  page.on("pageerror", (e) => {
    errors++;
    console.log(`[pageerror] ${theme} ${page.url()} :: ${String(e).slice(0, 300)}`);
  });
  for (const r of routes) {
    await page.goto(base + r, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const name = `${out}/${theme}-${width}-${r === "/" ? "cockpit" : r.slice(1).replace(/[/?=&]/g, "_")}.png`;
    await page.screenshot({ path: name, fullPage: true });
    console.log("saved", name);
  }
  await ctx.close();
}
await browser.close();
console.log(`console errors: ${errors}`);
