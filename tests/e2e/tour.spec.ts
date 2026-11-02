import { expect, test } from "@playwright/test";

test("guided demo walks the four steps without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.addInitScript(() => {
    (window as unknown as { __TOUR_SPEED__: number }).__TOUR_SPEED__ = 0.04;
  });
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId("start-tour").click();
  await expect(page.getByTestId("tour-overlay")).toBeVisible();

  const seen = new Set<string>();
  await expect
    .poll(
      async () => {
        const t = (await page.getByTestId("tour-title").textContent()) ?? "";
        seen.add(t);
        return t;
      },
      { timeout: 120_000, intervals: [150] },
    )
    .toBe("Guided demo complete");
  for (const t of ["Add documents", "Review the levels", "The result"]) expect([...seen], `missed step "${t}"`).toContain(t);

  await expect(page).toHaveURL(/\/results/);
  await expect(page.getByTestId("headline")).toContainText("Supply Chain is at Level 2");
  await expect(page.getByText("All levels reviewed")).toBeVisible();

  // the change made during the tour is kept with its reason
  await page.goto("/review");
  await expect(page.getByTestId("process-Transportation").getByText(/SAP creates a shipment document/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});
