import { expect, test } from "@playwright/test";

test("phase 3: baseline whitespaces are exactly DAM, TMS, Finance reconciliation, HR analytics", async ({ page }) => {
  await page.goto("/scoring");
  await page.getByRole("radio", { name: "2025 baseline" }).click();
  await page.goto("/roadmap");
  const list = page.getByTestId("whitespace-list");
  await expect(list.getByRole("link")).toHaveCount(4);
  for (const name of ["Digital Asset Management", "Transportation Management System", "Reconciliation (Finance)", "Analytics (HR)"])
    await expect(list).toContainText(name);
});

test("phase 3: no use case is drawn in an earlier phase than its dependency", async ({ page }) => {
  await page.goto("/roadmap");
  await page.locator("[data-uc]").first().waitFor();
  const cards = await page.locator("[data-uc]").evaluateAll((els) =>
    els.map((e) => ({ id: e.getAttribute("data-uc")!, phase: e.getAttribute("data-phase")!, deps: (e.getAttribute("data-deps") ?? "").split(" ").filter(Boolean) })),
  );
  const phase = Object.fromEntries(cards.map((c) => [c.id, c.phase]));
  const order: Record<string, number> = { Now: 0, Next: 1, Later: 2 };
  expect(cards.length).toBeGreaterThan(10);
  let checked = 0;
  for (const c of cards)
    for (const d of c.deps)
      if (phase[d]) {
        expect(order[phase[d]]!, `${d} before ${c.id}`).toBeLessThanOrEqual(order[c.phase]!);
        checked++;
      }
  expect(checked).toBeGreaterThan(3);
});
