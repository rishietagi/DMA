// Renders the Results step with the print stylesheet to <out>/results.pdf (after loading the demo
// pack) — the same output as the "Print or save as PDF" button. Usage: node scripts/print-results.mjs [baseUrl]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3100";
const out = process.env.QA_OUT ?? "qa-screenshots";
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(base + "/inputs");
await p.getByTestId("load-demo").click();
await p.getByText(/sentences? mapped to/).first().waitFor({ timeout: 90_000 });
await p.goto(base + "/results", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.emulateMedia({ media: "print" });
await p.pdf({ path: `${out}/results.pdf`, format: "A4", landscape: true, printBackground: true });
// preview of the printed layout (A4 landscape content width ≈ 1032px at 96 dpi)
await p.setViewportSize({ width: 1032, height: 700 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/results-print.png`, fullPage: true });
await b.close();
console.log(`${out}/results.pdf`);
