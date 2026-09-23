import { describe, expect, test } from "vitest"

import {
  getCompositionDateAt,
  getCompositionPointX,
  getCompositionView,
  getCompositionWidth,
} from "./body-composition"
import type { FitnessLog } from "./fitness"

function log(date: string, weight: number | null = 70): FitnessLog {
  return {
    date,
    weight,
    bodyFat: null,
    muscleMass: null,
    steps: null,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
  }
}

describe("身体組成の表示期間と選択", () => {
  test("30日は基準日を含む暦日で、月境界と未来の記録を扱う", () => {
    const logs = ["2026-01-31", "2026-02-01", "2026-03-02", "2026-03-03"].map(
      (date) => log(date)
    )
    const view = getCompositionView(logs, "2026-03-02", 30, "weight", null)
    expect(view.visibleLogs.map((row) => row.date)).toEqual([
      "2026-02-01",
      "2026-03-02",
    ])
    expect(view.selectedLog?.date).toBe("2026-03-02")
  })

  test("7日は年境界・うるう日でも暦日で絞る", () => {
    const dates = [
      "2023-12-31",
      "2024-01-01",
      "2024-01-07",
      "2024-02-28",
      "2024-02-29",
      "2024-03-06",
    ]
    const logs = dates.map((date) => log(date))
    expect(
      getCompositionView(logs, "2024-01-07", 7, "weight", null).visibleLogs.map(
        (row) => row.date
      )
    ).toEqual(["2024-01-01", "2024-01-07"])
    expect(
      getCompositionView(logs, "2024-03-06", 7, "weight", null).visibleLogs.map(
        (row) => row.date
      )
    ).toEqual(["2024-02-29", "2024-03-06"])
  })

  test("選択を維持し、期間外・指標欠測・削除後は最新の有効な日へ補正する", () => {
    const logs = [
      log("2026-08-01"),
      log("2026-08-20", 69),
      log("2026-08-23", null),
    ]
    logs[0].bodyFat = 20
    logs[2].bodyFat = 19
    expect(
      getCompositionView(logs, "2026-08-23", 30, "weight", "2026-08-01")
        .selectedLog?.date
    ).toBe("2026-08-01")
    expect(
      getCompositionView(logs, "2026-08-23", 7, "weight", "2026-08-01")
        .selectedLog?.date
    ).toBe("2026-08-20")
    expect(
      getCompositionView(logs, "2026-08-23", 30, "bodyFat", "2026-08-20")
        .selectedLog?.date
    ).toBe("2026-08-23")
    expect(
      getCompositionView(logs, "2026-08-23", 30, "weight", "2026-08-22")
        .selectedLog?.date
    ).toBe("2026-08-20")
  })

  test("期間内に値がないとき、期間外の値を表示しない", () => {
    const view = getCompositionView(
      [log("2026-08-01"), log("2026-08-23", null)],
      "2026-08-23",
      7,
      "weight",
      "2026-08-01"
    )
    expect(view.selectedLog).toBeNull()
    expect(view.summaries.weight).toEqual({ value: null, difference: null })
    expect(view.selectableLogs).toEqual([])
    expect(
      getCompositionView([], "2026-08-23", "all", "weight", null).selectedLog
    ).toBeNull()
  })

  test("取得済み全体は日付順に並び、前回差は表示期間の外も参照する", () => {
    const logs = [log("2026-08-23", 69), log("2026-07-01", 70)]
    const view = getCompositionView(logs, "2026-08-23", 7, "weight", null)
    expect(view.summaries.weight).toEqual({ value: 69, difference: -1 })
    expect(
      getCompositionView(
        logs,
        "2026-08-23",
        "all",
        "weight",
        null
      ).visibleLogs.map((row) => row.date)
    ).toEqual(["2026-07-01", "2026-08-23"])
    expect(logs[0].date).toBe("2026-08-23")
  })

  test("欠測日のタップは描画位置が近い有効な記録へ吸着する", () => {
    const logs = [log("2026-08-01"), log("2026-08-02", null), log("2026-08-03")]
    expect(getCompositionDateAt(logs, "weight", "2026-08-02")).toBe(
      "2026-08-01"
    )
    expect(getCompositionDateAt(logs, "bodyFat", "2026-08-02")).toBeNull()
    expect(getCompositionDateAt(logs, "weight", "2026-08-04")).toBeNull()
  })
})

describe("描画幅", () => {
  test.each([7, 30, 35, 90])(
    "%i件でも44px以上の間隔と両端の余白を保つ",
    (count) => {
      for (const viewport of [220, 290, 800]) {
        const width = getCompositionWidth(count, viewport)
        const points = Array.from({ length: count }, (_, index) =>
          getCompositionPointX(index, count, width)
        )
        expect(width).toBeGreaterThanOrEqual(viewport)
        expect(points[0]).toBe(24)
        expect(points.at(-1)).toBe(width - 24)
        for (let i = 1; i < count; i++)
          expect(points[i] - points[i - 1]).toBeGreaterThanOrEqual(43.999)
      }
    }
  )

  test("0件・1件は有限の幅となり、1件は中央に置く", () => {
    expect(getCompositionWidth(0, 240)).toBe(240)
    expect(getCompositionPointX(0, 1, getCompositionWidth(1, 240))).toBe(120)
    expect(
      getCompositionView([log("2026-08-23")], "2026-08-23", 30, "weight", null)
        .ticks
    ).toEqual([69, 70, 71])
  })
})
