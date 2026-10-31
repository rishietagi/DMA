import { expect, test } from "@playwright/test";

test("phase 4: guided assessment walks stages 2 → 9 without console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.addInitScript(() => {
    (window as unknown as { __TOUR_SPEED__: number }).__TOUR_SPEED__ = 0.04;
  });
  await page.goto("/");
  await page.getByTestId("start-tour").click();
  const overlay = page.getByTestId("tour-overlay");
  await expect(overlay).toBeVisible();

  const seen = new Set<string>();
  const titles = ["Evidence goes in", "Interview intelligence", "Process lens", "Scores with reasons", "Validate at scale", "Cross-functional themes", "From gaps to use cases", "Roadmap and whitespaces", "Boardroom synthesis"];
  await expect
    .poll(
      async () => {
        const t = (await page.getByTestId("tour-title").textContent()) ?? "";
        seen.add(t);
        return t;
      },
      { timeout: 180_000, intervals: [150] },
    )
    .toBe("Guided assessment complete");
  for (const t of titles.slice(1)) expect([...seen], `missed step "${t}"`).toContain(t);

  await expect(page).toHaveURL(/\/synthesis/);
  await expect(page.getByLabel("Agent console").getByText("Guided assessment complete.")).toBeVisible();

  // the override made during the tour is recorded with its rationale
  await page.goto("/scoring?cap=gt-reco-beat");
  await expect(page.getByText(/Overridden at 3\.5/)).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});
