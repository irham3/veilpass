import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 1,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure", video: "retain-on-failure" },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npm run build && npm run start -- --hostname 0.0.0.0",
    url: "http://localhost:3000",
    env: {
      VEILPASS_HOST_ORIGIN: "http://localhost:3000,http://app-a.localhost:3000,http://app-b.localhost:3000",
      VEILPASS_LOGIN_ORIGIN: "http://localhost:3000",
      NEXT_PUBLIC_VEILPASS_LOGIN_ORIGIN: "http://localhost:3000",
    },
    // Local contributors can opt in when their development server is already
    // running; CI builds and starts the production server under test.
    reuseExistingServer: process.env.PLAYWRIGHT_REUSE_SERVER === "true",
    timeout: 120_000,
  },
});
