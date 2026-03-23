import { defineConfig } from "playwright/test";

const port = Number(process.env.HERO_E2E_PORT || 4173);

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /hero-regression\.spec\.mjs$/,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: 0,
  reporter: [
    ["list"],
    ["json", { outputFile: "output/playwright/hero-regression-results.json" }],
    ["html", { outputFolder: "output/playwright/hero-regression-html", open: "never" }],
  ],
  outputDir: "output/playwright/artifacts",
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    viewport: { width: 1440, height: 1200 },
    headless: true,
  },
  webServer: {
    command: "node scripts/serve-hero-static.mjs",
    url: `http://127.0.0.1:${port}/index.html`,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
