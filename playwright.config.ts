import { defineConfig, devices } from "@playwright/test";

/**
 * The suite drives the full docker-compose stack (see docker-compose.e2e.yml),
 * not a Vite dev server: these specs are here to catch what unit tests cannot —
 * CSRF negotiation, session cookies, and the Caddy routing that puts the client
 * and the API on one origin.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:8080";

export default defineConfig({
  testDir: "./tests/e2e/specs",
  outputDir: "./tests/e2e/test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Every worker registers its own accounts and tournaments against one shared
  // stack, so parallelism is safe; it is capped in CI only to keep the server's
  // rate limiters and the single Mongo container comfortable.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [
        ["github"],
        [
          "html",
          { outputFolder: "tests/e2e/playwright-report", open: "never" },
        ],
      ]
    : [
        ["list"],
        [
          "html",
          { outputFolder: "tests/e2e/playwright-report", open: "never" },
        ],
      ],
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
