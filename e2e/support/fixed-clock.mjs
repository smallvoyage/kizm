import { mock } from "node:test"

// Loaded only by Playwright's server command, never by the application/build.
const referenceDate = process.env.PLAYWRIGHT_REFERENCE_DATE
if (!referenceDate || !/^\d{4}-\d{2}-\d{2}$/.test(referenceDate)) {
  throw new Error("PLAYWRIGHT_REFERENCE_DATE must be a calendar date")
}
const now = new Date(`${referenceDate}T03:00:00.000Z`)
if (
  !Number.isFinite(now.getTime()) ||
  now.toISOString().slice(0, 10) !== referenceDate
) {
  throw new Error("PLAYWRIGHT_REFERENCE_DATE must be a valid calendar date")
}
mock.timers.enable({ apis: ["Date"], now })
