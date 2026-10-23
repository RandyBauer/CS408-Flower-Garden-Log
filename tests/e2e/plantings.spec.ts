import { expect, test, type Page } from "@playwright/test";

// Each test adds its own zone and bed, so tests running in parallel and the sample garden's
// own checks do not see each other's plantings.

const section = (page: Page, heading: string) =>
  page.locator("section", { has: page.getByRole("heading", { level: 2, name: heading }) });

async function addZoneAndBed(page: Page, name: string) {
  await page.goto("/zones");
  const addZone = page.getByRole("form", { name: "Add zone" });
  await addZone.getByLabel("Name").fill(`${name} Zone`);
  await addZone.getByLabel("Description").fill("Added by the end-to-end tests.");
  await addZone.getByRole("button", { name: "Add zone" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${name} Zone` })).toBeVisible();

  const addBed = page.getByRole("form", { name: "Add bed" });
  await addBed.getByLabel("Name").fill(`${name} Bed`);
  await addBed.getByLabel("Location note").fill("by the gate");
  await addBed.getByRole("button", { name: "Add bed" }).click();
  await page.getByRole("link", { name: `${name} Bed`, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${name} Bed` })).toBeVisible();
}

test("create, edit, end, and delete a planting", async ({ page }) => {
  const run = `Test ${Date.now()}`;
  await addZoneAndBed(page, run);

  // Create
  await page.getByRole("link", { name: "+ Add planting" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Add planting" })).toBeVisible();
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Date planted").fill("2026-05-18");
  await form.getByLabel("Flower").fill("Zinnia");
  await form.getByLabel("Variety").fill(run);
  await form.getByLabel("Color").fill("orange");
  await form.getByLabel("Quantity").fill("6");
  await form.getByLabel("Source").fill("Fred Meyer");
  await form.getByRole("button", { name: "Save planting" }).click();

  await expect(page.getByRole("heading", { level: 1, name: `${run} Bed` })).toBeVisible();
  const growing = section(page, "Growing now");
  const row = growing.getByRole("row", { name: new RegExp(run) });
  await expect(row).toContainText("Fred Meyer");
  await expect(row.getByRole("cell").nth(4)).toHaveText("6");

  // The plant library gains the new entry
  await page.goto("/plants");
  await expect(page.getByRole("row", { name: new RegExp(run) })).toContainText("2026");
  await page.goBack();

  // Edit
  await growing.getByRole("link", { name: `Edit Zinnia · ${run} · orange` }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Edit planting" })).toBeVisible();
  await page.getByRole("form", { name: "Planting" }).getByLabel("Quantity").fill("8");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(growing.getByRole("row", { name: new RegExp(run) }).getByRole("cell").nth(4)).toHaveText("8");

  // End: leaves Growing now and stays in History with its verdict
  await growing.getByRole("link", { name: `Edit Zinnia · ${run} · orange` }).click();
  const end = page.getByRole("form", { name: "End this planting" });
  await end.getByLabel("Date removed").fill("2026-10-04");
  await end.getByLabel("Verdict").selectOption("again");
  await end.getByRole("button", { name: "End planting" }).click();

  await expect(growing).toContainText("Nothing is planted in this bed now.");
  const history = section(page, "History");
  const ended = history.getByRole("row", { name: new RegExp(run) });
  await expect(ended).toContainText("Oct 4, 2026");
  await expect(ended).toContainText("Would plant again");

  // Delete: gone from history and from the library
  await history.getByRole("link", { name: `Edit Zinnia · ${run} · orange` }).click();
  await expect(page.getByText(/^Ended Oct 4, 2026/)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete planting" }).click();

  await expect(page.getByRole("heading", { level: 1, name: `${run} Bed` })).toBeVisible();
  await expect(history).toContainText("No past plantings recorded for this bed.");
  await page.goto("/plants");
  await expect(page.getByRole("row", { name: new RegExp(run) })).toHaveCount(0);
});

test("an invalid planting is rejected with a message", async ({ page }) => {
  await page.goto("/plantings/new?bed=4");
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Variety").fill("No flower given");
  await form.getByLabel("Quantity").fill("0");
  await form.getByRole("button", { name: "Save planting" }).click();

  await expect(page.getByText("Enter the flower, for example Zinnia.")).toBeVisible();
  await expect(page.getByText("Enter a whole number from 1 to 9999.")).toBeVisible();
  await expect(page).toHaveURL(/\/plantings\/new\?bed=4$/);
  await expect(form.getByLabel("Variety")).toHaveValue("No flower given");
});

test("an empty bed and zone can be deleted; a bed with plantings cannot", async ({ page }) => {
  const run = `Delete ${Date.now()}`;
  await addZoneAndBed(page, run);
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: `${run} Zone` }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("This zone has no beds yet.")).toBeVisible();

  await page.goto("/zones");
  const zoneRow = page.getByRole("row", { name: new RegExp(`${run} Zone`) });
  page.once("dialog", (dialog) => dialog.accept());
  await zoneRow.getByRole("button", { name: "Delete" }).click();
  await expect(zoneRow).toHaveCount(0);

  // South Fence's beds have plantings, so their Delete buttons are unavailable.
  await page.getByRole("link", { name: "South Fence", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "South Fence" })).toBeVisible();
  const deletes = page.getByRole("button", { name: "Delete" });
  await expect(deletes.first()).toBeVisible();
  for (const button of await deletes.all()) {
    await expect(button).toBeDisabled();
  }
});
