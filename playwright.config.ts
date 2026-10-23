import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build on port 3100 with its own database,
// reset to the sample garden and the demo account before each run.
const PORT = 3100;
const DATABASE_PATH = "data/e2e.db";
export const STORAGE_STATE = "test-results/.auth/gardener.json";

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    // Signs in once as the demo gardener and saves the cookie for the other tests.
    { name: "sign-in", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: STORAGE_STATE },
      dependencies: ["sign-in"],
    },
  ],
  webServer: {
    command: `npx tsx scripts/reset-db.ts ${DATABASE_PATH} && npm run build && npx next start --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    env: { DATABASE_PATH },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
