// Dev tool: measures the guided demo at real speed. Usage: node scripts/time-tour.mjs [baseUrl]
import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto((process.argv[2] ?? "http://localhost:3100") + "/");
await p.getByTestId("start-tour").waitFor();
const t0 = Date.now();
await p.getByTestId("start-tour").click();
await p.getByText("Guided demo complete", { exact: true }).waitFor({ timeout: 400000 });
console.log("tour seconds:", Math.round((Date.now() - t0) / 1000));
await b.close();
