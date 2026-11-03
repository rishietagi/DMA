import { expect, test, type Page } from "@playwright/test";

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

async function freshSession(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

const row = (page: Page, name: string) => page.getByTestId(`process-${name}`);

test("an uploaded note saying transport runs by phone lowers Transportation", async ({ page }) => {
  const errors = watchConsole(page);
  await freshSession(page);
  await page.goto("/inputs");

  // with no interview answer, only the 2025 self score speaks for Transportation
  await page.getByTestId("tab-insights").click();
  await page.getByTestId("qc-Transportation").click();
  await page.getByRole("option", { name: "Not answered" }).click();

  await page.getByTestId("tab-evidence").click();
  await page.getByTestId("file-input").setInputFiles({
    name: "Logistics_notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Logistics notes\n\nTransport is planned by phone with transporters; there is no TMS.\n"),
  });
  await expect(page.getByText("Logistics notes").first()).toBeVisible();
  await expect(page.getByText("Stage changed: Transportation stage 1 → 0")).toBeVisible({ timeout: 60_000 });

  await page.goto("/review");
  await expect(row(page, "Transportation").getByRole("img", { name: /Stage 0 of 5/ })).toBeVisible();
  await row(page, "Transportation").getByRole("button", { name: "Sources" }).click();
  await expect(row(page, "Transportation").getByText(/Transport is planned by phone/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("changing a level needs a reason and flows to the results", async ({ page }) => {
  const errors = watchConsole(page);
  await freshSession(page);
  await page.goto("/review");

  const r = row(page, "Sustainability");
  await r.getByTestId("change").click();
  await r.getByTestId("change-level").click();
  await page.getByRole("option", { name: /Stage 2 · Real-time/ }).click();
  await expect(r.getByTestId("change-save")).toBeDisabled();
  await r.getByTestId("change-reason").fill("Plant energy meters stream into the EHS system every hour.");
  await r.getByTestId("change-save").click();
  await expect(r.getByText(/Changed by A\. Consultant/)).toBeVisible();
  await expect(r.getByText(/Plant energy meters/)).toBeVisible();

  await page.getByTestId("accept-all").click();
  await expect(page.getByText("6/6 reviewed")).toBeVisible();

  await expect(r.getByTestId("validated-badge")).toContainText("Changed by A. Consultant");

  await page.goto("/results");
  const table = page.getByRole("table", { name: /Diagnostic table/ });
  // columns: overall · process · people · data · gap
  await expect(table.getByRole("row", { name: /Sustainability/ }).locator("td").first()).toHaveText("2.0");
  await expect(page.getByText("All levels reviewed")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("every step shows its visuals, and the details sheet explains a level", async ({ page }) => {
  const errors = watchConsole(page);
  await freshSession(page);
  await page.goto("/inputs");
  await page.getByTestId("load-demo").click();
  await expect(page.getByText(/sentences? mapped to Supply Chain/).first()).toBeVisible({ timeout: 60_000 });

  await page.getByTestId("tab-insights").click();
  await expect(page.getByTestId("insight-Transportation")).toContainText(/\d+ evidence references?/);

  await page.getByTestId("tab-interviews").click();
  await expect(page.getByText("What people told us")).toBeVisible();
  await expect(page.getByTestId("transcript-input")).toBeAttached();
  await page.getByTestId("load-transcript").click();
  await expect(page.getByTestId("load-transcript")).toHaveText(/Sample transcript loaded/, { timeout: 60_000 });
  await expect(page.getByText(/Warehouse & Logistics Manager/).first()).toBeVisible();

  await page.goto("/review");
  await row(page, "Demand planning / IBP").getByTestId("details").click();
  const sheet = page.getByTestId("process-sheet");
  await expect(sheet.getByRole("img", { name: /Signals on the 0 to 5 ladder/ })).toBeVisible();
  await expect(sheet.getByText("How the score is calculated")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/results");
  await expect(page.getByLabel("AI generated insights").getByRole("listitem")).toHaveCount(3);
  await expect(page.getByRole("img", { name: /Current maturity \d\.\d, target 3\.0/ })).toBeVisible();
  for (const name of [/Bar chart, 2025 versus today/, /Bar chart of functions on the ladder/])
    await expect(page.getByRole("img", { name }).first()).toBeVisible();
  await expect(page.getByRole("group", { name: "Value versus ease of the ideas" })).toBeVisible();
  await expect(page.getByTestId("whitespace-Transportation")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("answering the questionnaire and adding your own question move the level", async ({ page }) => {
  const errors = watchConsole(page);
  await freshSession(page);
  await page.goto("/inputs");
  await page.getByTestId("tab-questions").click();
  await page.getByTestId("qstep-Transportation").click();
  const level = page.getByTestId("q-level");
  const before = await level.innerText();

  // a bank question: answer "TMS integrated with SAP"
  await page.getByTestId("question-scm-q06").getByRole("radio", { name: /TMS integrated with SAP/ }).click();
  await expect(level).not.toHaveText(before);

  // your own question, answered at L4
  await page.getByTestId("add-question").click();
  await page.getByTestId("cq-text").fill("Do drivers use a mobile app for proof of delivery");
  await page.getByTestId("cq-answer").click();
  await page.getByRole("option", { name: /Stage 4 · Predictive/ }).click();
  await page.getByTestId("cq-save").click();
  const own = page.getByTestId("custom-question");
  await expect(own).toContainText("Do drivers use a mobile app for proof of delivery?");
  await expect(own.getByRole("radio", { name: /Predictive/ })).toHaveAttribute("aria-checked", "true");

  // it shows in the calculation on Review
  await page.goto("/review");
  await row(page, "Transportation").getByTestId("details").click();
  await expect(page.getByTestId("process-sheet").getByText(/Added by you · Do drivers use a mobile app/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("old workbench links land on the matching step", async ({ page }) => {
  await page.goto("/scoring");
  await expect(page).toHaveURL(/\/review$/);
  await page.goto("/synthesis");
  await expect(page).toHaveURL(/\/results$/);
});

test("you can add, rename and delete your own process", async ({ page }) => {
  const errors = watchConsole(page);
  await freshSession(page);

  await page.getByTestId("add-process").click();
  await page.getByTestId("cp-name").fill("Transportation");
  await expect(page.getByText("A process with this name already exists.")).toBeVisible();
  await expect(page.getByTestId("cp-save")).toBeDisabled();
  await page.getByTestId("cp-name").fill("Returns management");
  await page.getByTestId("cp-words").fill("returns, reverse logistics");
  await page.getByTestId("cp-save").click();
  const card = page.getByTestId("custom-process-Returns management");
  await expect(card).toContainText("Added by you");
  await expect(card.locator("[aria-pressed]")).toHaveAttribute("aria-pressed", "true");

  // answer its quick check, then rename it: the answer moves with it
  await page.goto("/inputs");
  await page.getByTestId("tab-insights").click();
  await page.getByTestId("qc-Returns management").click();
  await page.getByRole("option", { name: /Stage 2 · Real-time/ }).click();
  await page.goto("/");
  await card.getByTestId("cp-edit").click();
  await page.getByTestId("cp-name").fill("Returns & reverse logistics");
  await page.getByTestId("cp-save").click();
  const renamed = page.getByTestId("custom-process-Returns & reverse logistics");
  await expect(renamed).toBeVisible();

  await page.goto("/review");
  await expect(row(page, "Returns & reverse logistics").getByRole("img", { name: /Stage 2 of 5/ })).toBeVisible();

  await page.goto("/");
  await renamed.getByTestId("cp-delete").click();
  await expect(renamed).toHaveCount(0);
  await page.goto("/review");
  await expect(row(page, "Returns & reverse logistics")).toHaveCount(0);
  expect(errors, errors.join("\n")).toEqual([]);
});
