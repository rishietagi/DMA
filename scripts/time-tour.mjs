// Dev tool: measures the guided assessment at real speed. Usage: node scripts/time-tour.mjs
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto("http://localhost:3100/");
await p.getByTestId("start-tour").waitFor();
const t0 = Date.now();
await p.getByTestId("start-tour").click();
await p.getByText("Guided assessment complete", { exact: true }).waitFor({ timeout: 400000 });
console.log("tour seconds:", Math.round((Date.now() - t0) / 1000));
await b.close();
