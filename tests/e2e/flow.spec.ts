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
  await page.getByTestId("qc-Transportation").click();
  await page.getByRole("option", { name: "Not answered" }).click();

  await page.getByTestId("file-input").setInputFiles({
    name: "Logistics_notes.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("# Logistics notes\n\nTransport is planned by phone with transporters; there is no TMS.\n"),
  });
  await expect(page.getByText("Logistics notes").first()).toBeVisible();
  await expect(page.getByText("Level changed: Transportation L1 → L0")).toBeVisible({ timeout: 60_000 });

  await page.goto("/review");
  await expect(row(page, "Transportation").getByRole("img", { name: /Level 0 of 5/ })).toBeVisible();
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
  await page.getByRole("option", { name: /L2 · Real-time/ }).click();
  await expect(r.getByTestId("change-save")).toBeDisabled();
  await r.getByTestId("change-reason").fill("Plant energy meters stream into the EHS system every hour.");
  await r.getByTestId("change-save").click();
  await expect(r.getByText(/Changed by A\. Consultant/)).toBeVisible();
  await expect(r.getByText(/Plant energy meters/)).toBeVisible();

  await page.getByTestId("accept-all").click();
  await expect(page.getByText("6 of 6 reviewed")).toBeVisible();

  await page.goto("/results");
  const table = page.getByRole("table");
  // columns: 2025 · today · target
  await expect(table.getByRole("row", { name: /Sustainability/ }).locator("td").nth(1).getByRole("img", { name: /Level 2 of 5/ })).toBeVisible();
  await expect(page.getByText("All levels reviewed")).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("every step shows its visuals, and the details sheet explains a level", async ({ page }) => {
  const errors = watchConsole(page);
  await freshSession(page);
  await page.goto("/inputs");
  await page.getByTestId("load-demo").click();
  await expect(page.getByText(/sentences? mapped to Supply Chain/).first()).toBeVisible({ timeout: 60_000 });

  await page.getByTestId("tab-found").click();
  await expect(page.getByRole("list", { name: "Process chain" })).toBeVisible();
  await page.getByTestId("tab-interviews").click();
  await expect(page.getByText("Where sources disagree")).toBeVisible();

  await page.goto("/review");
  await row(page, "Demand planning / IBP").getByTestId("details").click();
  const sheet = page.getByTestId("process-sheet");
  await expect(sheet.getByRole("img", { name: /Signals on the 0 to 5 ladder/ })).toBeVisible();
  await expect(sheet.getByText("How the score is calculated")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/results");
  for (const name of [/Radar: today versus target/, /Bar chart, 2025 versus today/, /Bar chart of functions on the ladder/])
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
  await page.getByRole("option", { name: /L4 · Predictive/ }).click();
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
