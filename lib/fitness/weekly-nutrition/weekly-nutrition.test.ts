import { describe, expect, test } from "vitest"
import { shiftDate } from "@/lib/calendar-date"
import type { FitnessLog } from "@/lib/fitness"
import { getWeeklyNutrition } from "./weekly-nutrition"

function log(date: string, values: Partial<FitnessLog> = {}): FitnessLog {
  return {
    date,
    steps: null,
    calories: null,
    protein: null,
    fat: null,
    carbs: null,
    weight: null,
    bodyFat: null,
    muscleMass: null,
    ...values,
  }
}

function week(start: string, calories: number): FitnessLog[] {
  return Array.from({ length: 7 }, (_, day) =>
    log(shiftDate(start, day) as string, {
      calories,
      protein: 100,
      fat: 60,
      carbs: 250,
    })
  )
}

function completeLogs() {
  return [...week("2026-08-03", 2_000), ...week("2026-08-10", 2_100)]
}

function review(logs = completeLogs(), referenceDate = "2026-08-17") {
  return getWeeklyNutrition(logs, "2026-08-10", referenceDate)
}

describe("getWeeklyNutrition", () => {
  test("終了済みの連続する2週が各7日そろった指標のみ比較する", () => {
    const result = review()
    expect(result).toMatchObject({
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      eligibleEndDate: "2026-08-16",
      eligibleDays: 7,
      previousEligibleDays: 7,
      isComplete: true,
    })
    expect(result?.averages.calories).toEqual({
      value: 2_100,
      recordedDays: 7,
      excludedRecords: [],
      previous: { value: 2_000, recordedDays: 7, excludedRecords: [] },
      previousDifference: 100,
      comparisonStatus: "comparable",
    })
    expect(result?.averages.protein.previousDifference).toBe(0)
    expect(result?.averages.protein.comparisonStatus).toBe("comparable")
  })

  test.each([
    ["2026-08-10", null, 0, "no-eligible-days"],
    ["2026-08-12", "2026-08-11", 2, "in-progress"],
    ["2026-08-16", "2026-08-15", 6, "in-progress"],
    ["2026-08-17", "2026-08-16", 7, "comparable"],
    ["2026-09-08", "2026-08-16", 7, "comparable"],
  ])("基準日%sで終了した日だけ集計する", (reference, end, days, status) => {
    const result = review(completeLogs(), reference)
    expect(result?.eligibleEndDate).toBe(end)
    expect(result?.eligibleDays).toBe(days)
    expect(result?.averages.calories.recordedDays).toBe(days)
    expect(result?.averages.calories.comparisonStatus).toBe(status)
    expect(result?.averages.calories.previousDifference).toBe(
      days === 7 ? 100 : null
    )
  })

  test("今日と未来の値・重複・不正値は過去の平均や比較理由に影響しない", () => {
    const logs = completeLogs()
    logs[9].calories = 500
    logs.push(
      log("2026-08-12", { calories: -1 }),
      log("2026-08-18", { calories: 9_000 })
    )
    expect(review(logs, "2026-08-12")?.averages.calories).toMatchObject({
      value: 2_100,
      recordedDays: 2,
      comparisonStatus: "in-progress",
      excludedRecords: [],
    })
  })

  test.each([
    ["current", "incomplete-current", 5, 7],
    ["previous", "insufficient-previous", 7, 5],
  ])(
    "%sの2日が欠けると記録日平均だけを返す",
    (side, status, currentDays, previousDays) => {
      const logs = completeLogs().filter((_, index) =>
        side === "current" ? index < 12 : index >= 2
      )
      expect(review(logs)?.averages.calories).toMatchObject({
        value: 2_100,
        recordedDays: currentDays,
        previous: { value: 2_000, recordedDays: previousDays },
        comparisonStatus: status,
        previousDifference: null,
      })
    }
  )

  test("両週に欠損がある場合は当週の不足を先に示す", () => {
    const logs = completeLogs().filter((_, index) => index !== 0 && index !== 7)
    expect(review(logs)?.averages.calories.comparisonStatus).toBe(
      "incomplete-current"
    )
  })

  test("1指標の欠損は他の指標の比較に影響しない", () => {
    const logs = completeLogs()
    logs[7].protein = null
    const result = review(logs)
    expect(result?.averages.calories.comparisonStatus).toBe("comparable")
    expect(result?.averages.protein).toMatchObject({
      value: 100,
      recordedDays: 6,
      previousDifference: null,
      comparisonStatus: "incomplete-current",
    })
  })

  test("0は有効な日次値として数える", () => {
    const logs = [...week("2026-08-03", 0), ...week("2026-08-10", 0)]
    expect(review(logs)?.averages.calories).toMatchObject({
      value: 0,
      recordedDays: 7,
      previousDifference: 0,
      comparisonStatus: "comparable",
    })
  })

  test("記録がない指標は0平均とせず、当週の記録なしを優先する", () => {
    expect(review([])?.averages.calories).toEqual({
      value: null,
      recordedDays: 0,
      excludedRecords: [],
      previous: { value: null, recordedDays: 0, excludedRecords: [] },
      comparisonStatus: "no-current-data",
      previousDifference: null,
    })
    expect(review([], "2026-08-12")?.averages.calories.comparisonStatus).toBe(
      "no-current-data"
    )
  })

  test("前週が取得範囲外でも、別の古い週で代用しない", () => {
    const logs = [...week("2026-07-27", 2_000), ...week("2026-08-10", 2_100)]
    expect(review(logs)?.averages.calories).toMatchObject({
      previous: { value: null, recordedDays: 0 },
      previousDifference: null,
      comparisonStatus: "insufficient-previous",
    })
  })

  test.each(["2026-08-03", "2026-08-10"])(
    "%sの重複はその日・指標だけ除外し、比較を止める",
    (date) => {
      const logs = [...completeLogs(), log(date, { calories: 2_100 })]
      const result = review(logs)
      const metric = result?.averages.calories
      expect(metric?.comparisonStatus).toBe("invalid-records")
      expect(metric?.previousDifference).toBeNull()
      const affected = date === "2026-08-03" ? metric?.previous : metric
      expect(affected?.recordedDays).toBe(6)
      expect(affected?.excludedRecords).toEqual([{ date, reason: "duplicate" }])
      expect(result?.averages.protein.comparisonStatus).toBe("comparable")
      expect(review([...logs].reverse())).toEqual(result)
    }
  )

  test("同日に値1つとnullがある場合は1日分として扱う", () => {
    expect(review([...completeLogs(), log("2026-08-10")])).toEqual(review())
  })

  test.each([
    -1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
  ])("不正値%sは平均から除外し、比較を止める", (value) => {
    const logs = completeLogs()
    logs[7].calories = value
    expect(review(logs)?.averages.calories).toMatchObject({
      value: 2_100,
      recordedDays: 6,
      previousDifference: null,
      comparisonStatus: "invalid-records",
      excludedRecords: [{ date: "2026-08-10", reason: "invalid-value" }],
    })
  })

  test("不正値は有効値と同日にあっても採用せず、記録なしより先に示す", () => {
    const logs = [
      log("2026-08-10", { calories: -1 }),
      log("2026-08-10", { calories: 2_000 }),
    ]
    expect(review(logs, "2026-08-12")?.averages.calories).toMatchObject({
      value: null,
      recordedDays: 0,
      comparisonStatus: "invalid-records",
    })
  })

  test("未来の週では前週も今日以降を除外する", () => {
    const result = getWeeklyNutrition(
      completeLogs(),
      "2026-08-17",
      "2026-08-12"
    )
    expect(result).toMatchObject({
      eligibleDays: 0,
      eligibleEndDate: null,
      previousEligibleDays: 2,
    })
    expect(result?.averages.calories.previous.recordedDays).toBe(2)
  })

  test("有限値の合計が範囲を超えても平均は有限値になる", () => {
    expect(
      review(week("2026-08-10", Number.MAX_VALUE))?.averages.calories.value
    ).toBe(Number.MAX_VALUE)
  })

  test.each([
    ["2025-12-29", "2026-01-05", "2026-01-04"],
    ["2024-02-26", "2024-03-04", "2024-03-03"],
  ])("%sの週を年・月・うるう日をまたいで集計する", (start, reference, end) => {
    const result = getWeeklyNutrition(week(start, 2_000), start, reference)
    expect(result).toMatchObject({ endDate: end, eligibleDays: 7 })
    expect(result?.averages.calories.value).toBe(2_000)
  })

  test.each([
    ["2026-08-11", "2026-08-17"],
    ["2026-02-30", "2026-08-17"],
    ["2026-08-10", "2026-02-30"],
    ["0001-01-01", "0001-01-08"],
    ["9999-12-27", "9999-12-31"],
  ])("不正な期間%s / %sは拒否する", (start, reference) => {
    expect(getWeeklyNutrition([], start, reference)).toBeNull()
  })

  test("不正な日付の記録を日数に数えない", () => {
    const logs = [...completeLogs(), log("2026-08-10-extra", { calories: 1 })]
    expect(review(logs)).toEqual(review())
  })

  test.each(["UTC", "Asia/Tokyo"])(
    "実行環境TZ=%sでも日付の解釈は変わらない",
    (timeZone) => {
      const original = process.env.TZ
      try {
        process.env.TZ = timeZone
        expect(review(completeLogs(), "2026-08-12")).toMatchObject({
          eligibleDays: 2,
          eligibleEndDate: "2026-08-11",
        })
      } finally {
        if (original === undefined) delete process.env.TZ
        else process.env.TZ = original
      }
    }
  )
})
