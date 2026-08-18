import { describe, expect, test } from "vitest"

import { isCalendarDate, parseCalendarDate } from "./calendar-date"

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
