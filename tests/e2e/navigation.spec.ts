import { expect, test } from "@playwright/test";
import { sections } from "../../lib/sections";

test("home links reach every section", async ({ page }) => {
  await page.goto("/");
  const links = page.getByRole("navigation", { name: "Sections" }).getByRole("link");
  await expect(links).toHaveCount(sections.length);

  const hrefs = await links.evaluateAll((anchors) =>
    anchors.map((a) => a.getAttribute("href") ?? ""),
  );
  expect(hrefs).toEqual(sections.map((section) => section.href));

  for (const href of hrefs) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("Flower Garden Log");
  }
});

test("zones, zone detail, and bed detail show the sample garden", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Zones", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Zones" })).toBeVisible();

  await page.getByRole("link", { name: "South Fence" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "South Fence" })).toBeVisible();
  await expect(page.getByText("Peony · Sarah Bernhardt · pink")).toBeVisible();

  await page.getByRole("link", { name: "Fence Border" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Fence Border" })).toBeVisible();
  const growing = page.locator("section", { has: page.getByRole("heading", { name: "Growing now" }) });
  await expect(growing.getByRole("row")).toHaveCount(4); // header + 3 plantings
  const history = page.locator("section", { has: page.getByRole("heading", { name: "History" }) });
  await expect(history.getByText("Would plant again")).toBeVisible();

  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "South Fence" }).click();
  await expect(page).toHaveURL(/\/zones\/\d+$/);
});

test("unknown zone and bed ids show Page not found", async ({ page }) => {
  for (const href of ["/zones/9999", "/beds/9999", "/beds/abc"]) {
    await page.goto(href);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
});

test("health check reports the database is open", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
});
