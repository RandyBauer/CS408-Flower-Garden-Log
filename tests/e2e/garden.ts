import { expect, type Page } from "@playwright/test";

// Helpers shared by the end-to-end tests.

// The <section> under a level-2 heading, such as "Growing now" or "History" on a bed page.
export const section = (page: Page, heading: string) =>
  page.locator("section", { has: page.getByRole("heading", { level: 2, name: heading }) });

// Adds a zone with one bed and opens the bed. Each test adds its own, so tests running in parallel
// and the sample garden's own checks do not see each other's plantings.
export async function addZoneAndBed(page: Page, name: string) {
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
