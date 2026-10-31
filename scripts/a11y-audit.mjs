// Lighthouse accessibility audit for every route (light + dark). Target ≥ 90.
// Usage: node scripts/a11y-audit.mjs [baseUrl]
import { chromium } from "@playwright/test";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const base = process.argv[2] ?? "http://localhost:3100";
const routes = process.env.ROUTES ? process.env.ROUTES.split(",") : ["/", "/scope", "/evidence", "/interviews", "/process", "/scoring", "/compare", "/opportunities", "/roadmap", "/synthesis"];
const chrome = await chromeLauncher.launch({ chromePath: chromium.executablePath(), chromeFlags: ["--headless=new", "--no-sandbox"] });
let worst = 100;
for (const theme of ["light", "dark"]) {
  for (const r of routes) {
    const res = await lighthouse(
      `${base}${r}?theme=${theme}`,
      { port: chrome.port, onlyCategories: ["accessibility"], logLevel: "error", screenEmulation: { disabled: true }, formFactor: "desktop" },
      { extends: "lighthouse:default", settings: { onlyCategories: ["accessibility"], formFactor: "desktop", screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false }, skipAboutBlank: true } },
    );
    const score = Math.round((res.lhr.categories.accessibility.score ?? 0) * 100);
    worst = Math.min(worst, score);
    const failing = Object.values(res.lhr.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary")
      .map((a) => `${a.id}${a.details?.items?.length ? ` (${a.details.items.length})` : ""}`);
    console.log(`${theme.padEnd(5)} ${r.padEnd(15)} ${score}${failing.length ? "  ✗ " + failing.join(", ") : ""}`);
  }
}
await chrome.kill();
console.log("worst score:", worst);
process.exit(worst >= 90 ? 0 : 1);
