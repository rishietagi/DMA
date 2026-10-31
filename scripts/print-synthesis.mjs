// Renders the Executive synthesis with the print stylesheet to qa-screenshots/synthesis.pdf
// (after loading demo evidence) — the same output as the "Export PDF" button.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3100";
mkdirSync("qa-screenshots", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(base + "/evidence");
await p.getByTestId("load-demo-evidence").click();
await p.getByText("Re-analyse demo evidence").waitFor({ timeout: 90_000 });
await p.goto(base + "/synthesis", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
await p.emulateMedia({ media: "print" });
await p.pdf({ path: "qa-screenshots/synthesis.pdf", format: "A4", landscape: true, printBackground: true });
// preview of the printed layout (A4 landscape content width ≈ 1032px at 96 dpi)
await p.setViewportSize({ width: 1032, height: 700 });
await p.waitForTimeout(400);
await p.screenshot({ path: "qa-screenshots/synthesis-print.png", fullPage: true });
await b.close();
console.log("qa-screenshots/synthesis.pdf");
