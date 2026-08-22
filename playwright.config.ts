import { createHash } from "node:crypto"
import { resolve } from "node:path"

import { defineConfig, devices } from "@playwright/test"

const worktreePath = process.cwd()
const reuseBuild = process.env.PLAYWRIGHT_REUSE_BUILD === "true"
const configuredPort = process.env.PLAYWRIGHT_PORT ?? process.env.PORT
const defaultPort =
  3100 +
  (Number.parseInt(
    createHash("sha256").update(worktreePath).digest("hex").slice(0, 8),
    16
  ) %
    2000)
const port = configuredPort ? Number(configuredPort) : defaultPort

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
    command: reuseBuild
      ? "pnpm start --hostname 127.0.0.1 --port $PORT"
      : "pnpm build && pnpm start --hostname 127.0.0.1 --port $PORT",
    cwd: worktreePath,
    env: {
      FITNESS_DATA_SOURCE: "fixture",
      FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
      PORT: String(port),
    },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
