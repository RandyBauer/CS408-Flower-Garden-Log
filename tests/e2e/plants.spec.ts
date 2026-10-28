import { expect, test } from "@playwright/test";

test("the plant library filters as you type and opens a plant's detail page", async ({ page }) => {
  await page.goto("/plants");
  await page.getByLabel("Filter library").fill("zinnia profusion");
  await expect(page.getByRole("row")).toHaveCount(2); // header + Zinnia Profusion Orange

  await page.getByRole("link", { name: "Open Zinnia · Profusion Orange · orange" }).click();
  await expect(page).toHaveURL(/\/plants\/\d+$/);
  await expect(page.getByRole("heading", { level: 1, name: "Zinnia · Profusion Orange" })).toBeVisible();
  await expect(page.getByText(/annual · grown 2 seasons/i)).toBeVisible();

  const plantings = page.locator("section", { has: page.getByRole("heading", { name: "Every planting" }) });
  await expect(plantings.getByRole("row")).toHaveCount(4); // header + 3 plantings
  await expect(plantings.getByRole("row", { name: /Walk Border.*Oct 11, 2025/ })).toContainText("Would plant again");

  await plantings.getByRole("link", { name: "Fence Border", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fence Border" })).toBeVisible();
});

test("renaming a library entry changes every planting of it", async ({ page }) => {
  const run = `Rename ${Date.now()}`;

  await page.goto("/plantings/new");
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Bed").selectOption({ label: "Patio Planters" });
  await form.getByLabel("Date planted").fill("2026-05-30");
  await form.getByLabel("Flower").fill("Zinnia");
  await form.getByLabel("Variety").fill(`${run} Orang`);
  await form.getByLabel("Color").fill("orange");
  await form.getByRole("button", { name: "Save planting" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Patio Planters" })).toBeVisible();

  await page.goto("/plants");
  await page.getByLabel("Filter library").fill(run);
  await page.getByRole("link", { name: `Open Zinnia · ${run} Orang · orange` }).click();

  await page.getByText("Edit entry", { exact: true }).click();
  const edit = page.getByRole("form", { name: "Edit entry" });
  await edit.getByLabel("Variety").fill(`${run} Orange`);
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `Zinnia · ${run} Orange` })).toBeVisible();

  await page.getByRole("link", { name: "Patio Planters", exact: true }).click();
  await expect(page.getByRole("row", { name: new RegExp(`${run} Orange`) })).toBeVisible();
});
