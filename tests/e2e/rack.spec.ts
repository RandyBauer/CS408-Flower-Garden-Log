import { expect, test, type Page } from "@playwright/test";
import { section } from "./garden";

// Adds a zone holding a grow rack and two outdoor beds, then a starter on the rack: snapdragons
// started Mar 3, 2026. Each test adds its own, so tests running in parallel do not share starters.
async function addRackWithStarter(page: Page, run: string, quantity: string) {
  await page.goto("/zones");
  const addZone = page.getByRole("form", { name: "Add zone" });
  await addZone.getByLabel("Name").fill(`${run} Zone`);
  await addZone.getByRole("button", { name: "Add zone" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${run} Zone` })).toBeVisible();

  for (const [name, kind] of [
    [`${run} Rack`, "rack"],
    [`${run} East`, "outdoor"],
    [`${run} West`, "outdoor"],
  ]) {
    const addBed = page.getByRole("form", { name: "Add bed" });
    await addBed.getByLabel("Name").fill(name);
    await addBed.getByLabel("Kind").selectOption(kind);
    await addBed.getByRole("button", { name: "Add bed" }).click();
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }

  await page.getByRole("link", { name: `${run} Rack`, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${run} Rack` })).toBeVisible();
  await page.getByRole("link", { name: "+ Add planting" }).click();
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Date planted").fill("2026-03-03");
  await form.getByLabel("Flower").fill("Snapdragon");
  await form.getByLabel("Variety").fill(run);
  await form.getByLabel("Color").fill("mixed");
  await form.getByLabel("Quantity").fill(quantity);
  await form.getByLabel("Source").fill("grown from seed");
  await form.getByRole("button", { name: "Save planting" }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${run} Rack` })).toBeVisible();
}

// Opens the Grow rack page from the header and the transplant form for the run's starter.
async function openTransplant(page: Page, run: string) {
  await page.getByRole("link", { name: "Grow rack", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Grow rack" })).toBeVisible();
  const row = section(page, "On the rack").getByRole("row", { name: new RegExp(run) });
  await expect(row).toContainText("Mar 3, 2026");
  await row.getByRole("link", { name: `Transplant Snapdragon · ${run} · mixed` }).click();
  await expect(page.getByRole("heading", { level: 2, name: `Transplant Snapdragon · ${run} · mixed` })).toBeVisible();
  return page.getByRole("form", { name: "Transplant" });
}

test("transplant one starter into two beds; both link back to the rack planting", async ({ page }) => {
  const run = `Rack ${Date.now()}`;
  await addRackWithStarter(page, run, "18");
  const form = await openTransplant(page, run);

  // One row starts with all 18. Lowering it to 10 leaves 8 for the next bed.
  const first = form.getByRole("group", { name: "Bed 1" });
  await expect(first.getByLabel("Quantity")).toHaveValue("18");
  await first.getByLabel("To bed").selectOption({ label: `${run} East` });
  await first.getByLabel("Quantity").fill("10");
  await form.getByRole("button", { name: "+ Another bed" }).click();
  const second = form.getByRole("group", { name: "Bed 2" });
  await expect(second.getByLabel("Quantity")).toHaveValue("8");
  await second.getByLabel("To bed").selectOption({ label: `${run} West` });
  await expect(form).toContainText("18 of the 18 started");
  await form.getByLabel("Date transplanted").fill("2026-05-16");
  await form.getByRole("button", { name: "Transplant", exact: true }).click();

  // The starter leaves the rack and is listed, marked, under Transplanted with both beds
  await expect(page).toHaveURL(/\/rack\?starter=\d+#starter-\d+$/);
  const starterId = new URL(page.url()).searchParams.get("starter");
  await expect(section(page, "On the rack").getByRole("row", { name: new RegExp(run) })).toHaveCount(0);
  const transplanted = section(page, "Transplanted").getByRole("row", { name: new RegExp(run) });
  await expect(transplanted).toHaveAttribute("aria-current", "true");
  await expect(transplanted).toContainText("Mar 3, 2026");
  await expect(transplanted).toContainText("May 16, 2026");
  await expect(transplanted).toContainText(`${run} East ×10`);
  await expect(transplanted).toContainText(`${run} West ×8`);

  // Each bed has its share, planted May 16, and links back to the same rack planting
  for (const [bed, quantity] of [
    [`${run} East`, "10"],
    [`${run} West`, "8"],
  ]) {
    await page.goto(`/rack?starter=${starterId}`);
    await section(page, "Transplanted")
      .getByRole("row", { name: new RegExp(run) })
      .getByRole("link", { name: bed })
      .click();
    await expect(page.getByRole("heading", { level: 1, name: bed })).toBeVisible();
    const row = section(page, "Growing now").getByRole("row", { name: new RegExp(run) });
    await expect(row.getByRole("cell").nth(5)).toHaveText(quantity);
    await expect(row).toContainText("May 16, 2026");
    await expect(row).toContainText("grown from seed");

    await row.getByRole("link", { name: "Started Mar 3, 2026 on the grow rack" }).click();
    await expect(page).toHaveURL(new RegExp(`/rack\\?starter=${starterId}#starter-${starterId}$`));
    await expect(section(page, "Transplanted").getByRole("row", { name: new RegExp(run) })).toHaveAttribute(
      "aria-current",
      "true",
    );
  }
});

test("a transplant that breaks a rule is rejected in the browser", async ({ page }) => {
  const run = `Rules ${Date.now()}`;
  await addRackWithStarter(page, run, "4");
  const form = await openTransplant(page, run);

  // Five from four started, the same bed twice, and a date before the starter was started
  const first = form.getByRole("group", { name: "Bed 1" });
  await first.getByLabel("To bed").selectOption({ label: `${run} East` });
  await first.getByLabel("Quantity").fill("3");
  await form.getByRole("button", { name: "+ Another bed" }).click();
  const second = form.getByRole("group", { name: "Bed 2" });
  await second.getByLabel("To bed").selectOption({ label: `${run} East` });
  await second.getByLabel("Quantity").fill("2");
  await form.getByLabel("Date transplanted").fill("2026-03-01");
  await form.getByRole("button", { name: "Transplant", exact: true }).click();

  await expect(form.getByText("This bed is already chosen above.")).toBeVisible();
  await expect(form.getByText("Only 4 were started. Transplant 4 or fewer in total.")).toBeVisible();
  await expect(form.getByText("The transplant date cannot be before the starter was started.")).toBeVisible();
  await expect(page).toHaveURL(/\/rack\?transplant=\d+#transplant$/);

  // Removing the second bed and fixing the date transplants the three
  await form.getByRole("button", { name: "Remove bed 2" }).click();
  await form.getByLabel("Date transplanted").fill("2026-05-16");
  await form.getByRole("button", { name: "Transplant", exact: true }).click();
  await expect(section(page, "Transplanted").getByRole("row", { name: new RegExp(run) })).toContainText(
    `${run} East ×3`,
  );
});
