import { expect, test, type Page } from "@playwright/test";

// Searches over the sample garden. The other end-to-end tests add plantings while these run, so
// the expected rows avoid anything they add: no petunias, nothing coral, no "would not" verdicts,
// no perennials, and nothing planted last year.

const results = (page: Page) => page.getByRole("region", { name: "Results" });

async function resultRows(page: Page): Promise<string[]> {
  const rows = results(page).getByRole("row");
  await expect(rows.first()).toBeVisible();
  return (await rows.allInnerTexts()).slice(1);
}

const lastYear = new Date().getFullYear() - 1;

const examples = [
  { label: "Coral flowers marked “would plant again”", query: "color=coral&verdict=again", count: 1 },
  { label: "Everything marked “would not” plant again", query: "verdict=no", count: 2 },
  { label: "Perennials in the ground now", query: "type=perennial&status=current", count: 6 },
  { label: `Annuals grown in ${lastYear}`, query: `year=${lastYear}&type=annual` },
  { label: "Petunias from any year", query: "flower=petunia", count: 5 },
];

test("with no filters, search shows example searches instead of results", async ({ page }) => {
  await page.goto("/search");
  await expect(page.getByRole("heading", { level: 2, name: "Example searches" })).toBeVisible();
  await expect(results(page)).toHaveCount(0);
  await expect(page.getByRole("table")).toHaveCount(0);
});

test("each example search returns a filtered subset reproducible from its URL", async ({ page }) => {
  for (const example of examples) {
    await page.goto("/search");
    await page.getByRole("link", { name: example.label }).click();
    await expect(page).toHaveURL(`/search?${example.query}`);
    const rows = await resultRows(page);
    if (example.count !== undefined) expect(rows, example.label).toHaveLength(example.count);
    else expect(rows.length, example.label).toBeGreaterThan(0);

    // Opening the same address again gives the same results and fills in the same filters.
    await page.goto(`/search?${example.query}`);
    expect(await resultRows(page), example.label).toEqual(rows);
  }

  await page.goto("/search?color=coral&verdict=again");
  const row = results(page).getByRole("row").nth(1);
  await expect(row).toContainText("Impatiens · SunPatiens Coral · coral");
  await expect(row).toContainText("Patio Edge");
  await expect(row).toContainText("Would plant again");
  await expect(page.getByLabel("Color")).toHaveValue("coral");
  await expect(page.getByLabel("Verdict")).toHaveValue("again");
});

test("the search form combines filters into an address, and Clear removes them", async ({ page }) => {
  await page.goto("/search");
  const form = page.getByRole("search", { name: "Search plantings" });
  await form.getByLabel("Flower").fill("petunia");
  await form.getByLabel("Zone or bed").selectOption({ label: "Fence Border" });
  await form.getByLabel("Status").selectOption({ label: "Past" });
  await form.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL("/search?flower=petunia&bed=4&status=past");
  await expect(results(page)).toContainText("flower: petunia · bed: Fence Border · past");
  const rows = await resultRows(page);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toContain("Petunia · Wave Purple · purple");

  await form.getByRole("link", { name: "Clear" }).click();
  await expect(page).toHaveURL("/search");
  await expect(page.getByRole("heading", { level: 2, name: "Example searches" })).toBeVisible();
  await expect(form.getByLabel("Flower")).toHaveValue("");
});

test("a search with no matches says so", async ({ page }) => {
  await page.goto("/search?flower=petunia&type=perennial");
  await expect(results(page)).toContainText("0 plantings");
  await expect(results(page)).toContainText("No plantings match.");
});
