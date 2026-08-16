import { describe, expect, test } from "vitest"
import { getWeekStart, shiftDate } from "@/lib/weekly-review"

describe("getWeekStart", () => {
  test.each([
    ["2026-08-17", "2026-08-17"],
    ["2026-08-23", "2026-08-17"],
    ["2026-01-01", "2025-12-29"],
  ])("%s を含む週の月曜日は %s", (date, expected) => {
    expect(getWeekStart(date)).toBe(expected)
  })
})

describe("shiftDate", () => {
  test.each([
    ["2026-01-31", 1, "2026-02-01"],
    ["2024-03-01", -1, "2024-02-29"],
    ["2025-12-31", 1, "2026-01-01"],
    ["2026-01-01", -1, "2025-12-31"],
  ])("%s を %i 日ずらすと %s", (date, days, expected) => {
    expect(shiftDate(date, days)).toBe(expected)
  })
})

describe("タイムゾーンに依存しない日付計算", () => {
  test.each(["UTC", "Asia/Tokyo"])("TZ=%s でも同じ結果になる", (timeZone) => {
    const originalTimeZone = process.env.TZ

    try {
      process.env.TZ = timeZone

      expect(getWeekStart("2026-08-23")).toBe("2026-08-17")
      expect(shiftDate("2025-12-31", 1)).toBe("2026-01-01")
    } finally {
      if (originalTimeZone === undefined) {
        delete process.env.TZ
      } else {
        process.env.TZ = originalTimeZone
      }
    }
  })
})
