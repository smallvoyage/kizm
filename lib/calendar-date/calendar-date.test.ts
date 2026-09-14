import { describe, expect, test } from "vitest"

import {
  getWeekStart,
  isCalendarDate,
  parseCalendarDate,
  shiftDate,
} from "./calendar-date"

describe("isCalendarDate", () => {
  test.each(["2026-01-01", "2024-02-29"])(
    "%s は有効なカレンダー日付",
    (value) => {
      expect(isCalendarDate(value)).toBe(true)
    }
  )

  test.each([
    "2026-02-29",
    "2026-04-31",
    "2026-02-31",
    "0000-01-01",
    "2026-1-01",
    "2026-01-1",
    "2026/01/01",
  ])("%s は無効なカレンダー日付", (value) => {
    expect(isCalendarDate(value)).toBe(false)
  })
})

test("有効な日付はUTCのDateとして返す", () => {
  expect(parseCalendarDate("2024-02-29")?.toISOString()).toBe(
    "2024-02-29T00:00:00.000Z"
  )
})

describe("getWeekStart", () => {
  test.each([
    ["2026-08-17", "2026-08-17"],
    ["2026-08-23", "2026-08-17"],
    ["2026-01-01", "2025-12-29"],
  ])("%s を含む週の月曜日は %s", (date, expected) => {
    expect(getWeekStart(date)).toBe(expected)
  })

  test.each(["2026-02-29", "2026-02-31", "2026-13-01"])(
    "%s のような不正な日付は拒否する",
    (date) => {
      expect(getWeekStart(date)).toBeNull()
    }
  )
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

  test("不正なカレンダー日付は補正せず拒否する", () => {
    expect(shiftDate("2026-02-31", 1)).toBeNull()
  })

  test("サポート範囲外への移動は拒否する", () => {
    expect(shiftDate("0001-01-01", -1)).toBeNull()
    expect(shiftDate("9999-12-31", 1)).toBeNull()
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
