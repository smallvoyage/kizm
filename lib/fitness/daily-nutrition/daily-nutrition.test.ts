import { describe, expect, it } from "vitest"
import type { FitnessLog } from "@/lib/fitness"
import { getDailyNutrition, getTokyoDate } from "./daily-nutrition"

const goals = { calories: 1800, protein: 140, fat: 50, carbs: 200 }
const log: FitnessLog = {
  date: "2026-09-19",
  calories: 1450,
  protein: 85,
  fat: 60,
  carbs: 200,
  steps: null,
  weight: null,
  bodyFat: null,
  muscleMass: null,
}

describe("getDailyNutrition", () => {
  it("摂取量・目標・残量を返し、超過を負数として保持する", () => {
    expect(getDailyNutrition(log, log.date, goals)).toEqual({
      date: log.date,
      status: "complete",
      metrics: {
        calories: { consumed: 1450, goal: 1800, remaining: 350 },
        protein: { consumed: 85, goal: 140, remaining: 55 },
        fat: { consumed: 60, goal: 50, remaining: -10 },
        carbs: { consumed: 200, goal: 200, remaining: 0 },
      },
    })
  })
  it("未入力とゼロを区別する", () => {
    const summary = getDailyNutrition(
      { ...log, protein: null, fat: 0 },
      log.date,
      goals
    )
    expect(summary.status).toBe("partial")
    expect(summary.metrics.protein).toEqual({
      consumed: null,
      goal: 140,
      remaining: null,
    })
    expect(summary.metrics.fat).toEqual({
      consumed: 0,
      goal: 50,
      remaining: 50,
    })
  })
  it.each([
    null,
    { ...log, date: "2026-09-18" },
    { ...log, calories: null, protein: null, fat: null, carbs: null },
  ])("今日の栄養データがなければ過去の値で補わない", (record) => {
    const summary = getDailyNutrition(record, log.date, goals)
    expect(summary.status).toBe("empty")
    expect(
      Object.values(summary.metrics).every(
        (metric) => metric.consumed === null && metric.remaining === null
      )
    ).toBe(true)
  })
  it("全項目ゼロも記録として扱う", () => {
    expect(
      getDailyNutrition(
        { ...log, calories: 0, protein: 0, fat: 0, carbs: 0 },
        log.date,
        goals
      ).status
    ).toBe("complete")
  })
})

it("日本時間の午前0時を境に今日を切り替える", () => {
  expect(getTokyoDate(new Date("2026-09-18T14:59:59Z"))).toBe("2026-09-18")
  expect(getTokyoDate(new Date("2026-09-18T15:00:00Z"))).toBe("2026-09-19")
})
