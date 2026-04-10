import { defineConfig, devices } from "@playwright/test";

const apiBase =
  process.env.PLAYWRIGHT_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  "http://localhost:3000";

/**
 * E2E: start backend on apiBase, then either reuse a running Vite dev server
 * or let Playwright start it (see webServer below).
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "api",
      testMatch: /.*api-smoke\.spec\.ts/,
    },
    {
      name: "chromium",
      testMatch: /.*full-flow\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm run dev",
      url: "http://localhost:5173",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        VITE_API_BASE_URL: apiBase,
      },
    },
    {
      command: "npm run dev",
      cwd: "../backend",
      url: "http://localhost:3000/health",
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        PORT: "3000",
      },
    },
  ],
});
