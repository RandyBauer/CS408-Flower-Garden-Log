import { expect, test as setup } from "@playwright/test";
import { DEMO_GARDENER } from "../../lib/accounts";
import { STORAGE_STATE } from "../../playwright.config";

// Signs in once and saves the session cookie, so the other tests start signed in.
setup("sign in as the demo gardener", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(DEMO_GARDENER.email);
  await page.getByLabel("Password").fill(DEMO_GARDENER.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/zones$/);
  await page.context().storageState({ path: STORAGE_STATE });
});
