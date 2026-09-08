import { createHash } from "node:crypto"
import { resolve } from "node:path"

import { defineConfig } from "@playwright/test"

const worktreePath = process.cwd()
const reuseBuild = process.env.PLAYWRIGHT_REUSE_BUILD === "true"
const visualRegression = process.env.PLAYWRIGHT_VISUAL_REGRESSION === "true"
const fixtureScenario = process.env.FITNESS_FIXTURE_SCENARIO ?? "normal"
const referenceDate = process.env.PLAYWRIGHT_REFERENCE_DATE ?? "2026-09-08"
const startCommand =
  "node --import ./e2e/support/fixed-clock.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port $PORT"
const configuredPort = process.env.PLAYWRIGHT_PORT ?? process.env.PORT
const defaultPort =
  3100 +
  (Number.parseInt(
    createHash("sha256").update(worktreePath).digest("hex").slice(0, 8),
    16
  ) %
    2000)
const port = configuredPort ? Number(configuredPort) : defaultPort

if (visualRegression && process.platform !== "linux") {
  throw new Error(
    "Visual regression must run on Linux. Use the pinned Playwright container documented in docs/testing.md."
  )
}

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(
    `PLAYWRIGHT_PORT must be an integer between 1 and 65535 (received: ${JSON.stringify(configuredPort)})`
  )
}

export default defineConfig({
  testDir: "./e2e",
  outputDir: resolve(worktreePath, "test-results"),
  reporter: [
    ["list"],
    ["html", { outputFolder: resolve(worktreePath, "playwright-report") }],
  ],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: reuseBuild ? startCommand : `pnpm build && ${startCommand}`,
    cwd: worktreePath,
    env: {
      FITNESS_DATA_SOURCE: "fixture",
      FITNESS_FIXTURE_SCENARIO: fixtureScenario,
      FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
      PLAYWRIGHT_REFERENCE_DATE: referenceDate,
      PORT: String(port),
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-320",
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 568 },
      },
    },
    {
      name: "chromium-390",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: "chromium-desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "firefox-desktop",
      use: {
        browserName: "firefox",
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "webkit-desktop",
      use: {
        browserName: "webkit",
        viewport: { width: 1280, height: 900 },
      },
    },
  ],
})
