import { expect, test, type Page } from "@playwright/test";

const errors: string[] = [];
function watchConsole(page: Page) {
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
}

/** Process-dimension cell of a capability row in the scoring workbench. */
async function processScore(page: Page, capId: string) {
  await page.goto(`/scoring`);
  const row = page.getByTestId(`row-${capId}`);
  await expect(row).toBeVisible();
  return (await row.locator("td").nth(2).innerText()).trim();
}

test("phase 2: demo evidence loads, and an uploaded PDF moves fin-reconciliation", async ({ page }) => {
  watchConsole(page);
  await page.goto("/evidence");
  await page.getByTestId("view-toggle").getByRole("radio", { name: "Detailed" }).click();
  await page.getByTestId("load-demo-evidence").click();
  await expect(page.getByText("Re-analyse demo evidence")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/evidence items mapped/).first()).toBeVisible();

  const before = await processScore(page, "fin-reconciliation");

  await page.goto("/evidence");
  await page.getByTestId("dropzone-process_docs").locator('input[type="file"]').setInputFiles("tests/fixtures/finance-procedures.pdf");
  await expect(page.getByText("finance procedures").first()).toBeVisible();
  await expect(page.getByText(/Reconciliation \(Finance\) process 2\.0 → 1\.5/)).toBeVisible({ timeout: 60_000 });

  const after = await processScore(page, "fin-reconciliation");
  expect(Number(after)).toBeLessThan(Number(before));

  await page.getByTestId("row-fin-reconciliation").click();
  await page.getByRole("tab", { name: /Evidence/ }).click();
  await expect(page.getByText("Reconciliation is done manually in Excel every week.").first()).toBeVisible();

  await page.goto("/interviews");
  await page.getByRole("tab", { name: "Notes and themes" }).click();
  await expect(page.getByTestId("contradiction")).toHaveCount(3);

  expect(errors, errors.join("\n")).toEqual([]);
});
