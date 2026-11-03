// Downloads the Results report (the same file as the "Export PDF" button) to <out>/results.pdf after
// loading the demo pack and confirming every level. Usage: node scripts/print-results.mjs [baseUrl]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const base = process.argv[2] ?? "http://localhost:3100";
const out = process.env.QA_OUT ?? "qa-screenshots";
mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
await p.goto(base + "/inputs");
await p.getByTestId("load-demo").click();
await p.getByText(/sentences? mapped to/).first().waitFor({ timeout: 90_000 });
await p.goto(base + "/review");
await p.getByTestId("accept-all").click();
await p.goto(base + "/results", { waitUntil: "networkidle" });
const [download] = await Promise.all([p.waitForEvent("download", { timeout: 60_000 }), p.getByTestId("export-pdf").click()]);
await download.saveAs(`${out}/results.pdf`);
await b.close();
console.log(`${out}/results.pdf`);
