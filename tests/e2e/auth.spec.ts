import { expect, test } from "@playwright/test";
import { DEMO_GARDENER } from "../../lib/accounts";

// These tests start signed out.
test.use({ storageState: { cookies: [], origins: [] } });

async function signIn(page: import("@playwright/test").Page, password = DEMO_GARDENER.password) {
  await page.getByLabel("Email").fill(DEMO_GARDENER.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("signed-out visitors are redirected from gardener pages to Sign in", async ({ page }) => {
  for (const path of ["/zones", "/zones/2", "/beds/4", "/plantings/new?bed=4", "/plants"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(`/sign-in?next=${encodeURIComponent(path)}`);
    await expect(page.getByRole("heading", { name: "Gardener sign in" })).toBeVisible();
  }
});

test("the home page is public", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1, name: "Flower Garden Log" })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("a wrong password is rejected; signing in returns to the page asked for", async ({ page }) => {
  await page.goto("/beds/4");
  await expect(page).toHaveURL(/\/sign-in\?next=/);

  await signIn(page, "not-the-password");
  await expect(page.getByRole("form", { name: "Sign in" }).getByRole("alert")).toHaveText("That email and password do not match.");
  await expect(page).toHaveURL(/\/sign-in/);

  await signIn(page);
  await expect(page).toHaveURL(/\/beds\/4$/);
  await expect(page.getByRole("heading", { level: 1, name: "Fence Border" })).toBeVisible();
});

test("signing out ends the session", async ({ page }) => {
  await page.goto("/sign-in");
  await signIn(page);
  await expect(page).toHaveURL(/\/zones$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/");
  await page.goto("/zones");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fzones$/);
});
