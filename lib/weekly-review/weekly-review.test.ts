import { describe, expect, test } from "vitest"
import type { FitnessLog } from "@/lib/fitness"
import { getWeeklyReview, getWeekStart, shiftDate } from "./weekly-review"

function createLog(date: string, values: Partial<FitnessLog> = {}): FitnessLog {
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

describe("getWeeklyReview", () => {
  test("nullを除外した週次平均、記録日数、前週差を返す", () => {
    const logs = [
      createLog("2026-08-03", {
        calories: 1_800,
        protein: 100,
        fat: 50,
        carbs: 200,
        weight: 70,
      }),
      createLog("2026-08-05", {
        protein: 120,
        carbs: 240,
        weight: 69.8,
      }),
      createLog("2026-08-09", {
        calories: 2_200,
        fat: 70,
        weight: 69.6,
      }),
      createLog("2026-08-10", {
        protein: 120,
        fat: 60,
        carbs: 240,
        weight: 70,
      }),
      createLog("2026-08-12", {
        calories: 2_200,
        fat: 70,
      }),
      createLog("2026-08-16", {
        calories: 2_400,
        protein: 140,
        carbs: 280,
        weight: 69,
      }),
    ]

    const review = getWeeklyReview(logs, "2026-08-10")

    expect(review?.nutrition.averages).toEqual({
      calories: { value: 2_300, previousDifference: 300, recordedDays: 2 },
      protein: { value: 130, previousDifference: 20, recordedDays: 2 },
      fat: { value: 65, previousDifference: 5, recordedDays: 2 },
      carbs: { value: 260, previousDifference: 40, recordedDays: 2 },
    })
    expect(review?.bodyComposition.weightAverage.value).toBe(69.5)
    expect(
      review?.bodyComposition.weightAverage.previousDifference
    ).toBeCloseTo(-0.3)
    expect(review?.bodyComposition.weightAverage.recordedDays).toBe(2)
  })

  test("記録がない週は平均、前週差、身体組成の変化をnullで返す", () => {
    const review = getWeeklyReview([], "2026-08-10")

    expect(review).toEqual({
      startDate: "2026-08-10",
      endDate: "2026-08-16",
      nutrition: {
        averages: {
          calories: {
            value: null,
            previousDifference: null,
            recordedDays: 0,
          },
          protein: {
            value: null,
            previousDifference: null,
            recordedDays: 0,
          },
          fat: {
            value: null,
            previousDifference: null,
            recordedDays: 0,
          },
          carbs: {
            value: null,
            previousDifference: null,
            recordedDays: 0,
          },
        },
      },
      bodyComposition: {
        weight: { start: null, end: null, difference: null },
        weightAverage: {
          value: null,
          previousDifference: null,
          recordedDays: 0,
        },
        bodyFat: { start: null, end: null, difference: null },
        muscleMass: { start: null, end: null, difference: null },
        recordedDays: 0,
      },
    })
  })

  test("身体組成はnullを飛ばした開始値、終了値、差を返す", () => {
    const logs = [
      createLog("2026-08-10", {
        weight: 70,
        bodyFat: 20,
        muscleMass: 50,
      }),
      createLog("2026-08-12", { bodyFat: 19.8 }),
      createLog("2026-08-16", { weight: 69, muscleMass: 51 }),
    ]

    const bodyComposition = getWeeklyReview(logs, "2026-08-10")?.bodyComposition

    expect(bodyComposition?.weight).toEqual({
      start: 70,
      end: 69,
      difference: -1,
    })
    expect(bodyComposition?.bodyFat.start).toBe(20)
    expect(bodyComposition?.bodyFat.end).toBe(19.8)
    expect(bodyComposition?.bodyFat.difference).toBeCloseTo(-0.2)
    expect(bodyComposition?.muscleMass).toEqual({
      start: 50,
      end: 51,
      difference: 1,
    })
    expect(bodyComposition?.recordedDays).toBe(3)
  })
})
