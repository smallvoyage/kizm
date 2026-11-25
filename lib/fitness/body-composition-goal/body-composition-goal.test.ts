import { describe, expect, it } from "vitest"

import type { FitnessLog } from "@/lib/fitness"

import {
  type BodyCompositionGoals,
  calculateBodyFatMass,
  getBodyCompositionGoalProgress,
  getGoalGap,
} from "./body-composition-goal"

const goals: BodyCompositionGoals = {
  deadline: "2027-03-31",
  targets: {
    weight: { kind: "range", min: 67.5, max: 68.5 },
    bodyFat: { kind: "atMost", value: 19.9 },
    bodyFatMass: { kind: "atMost", value: 13.5 },
    muscleMass: { kind: "atLeast", value: 31.3 },
  },
}

function log(date: string, values: Partial<FitnessLog>): FitnessLog {
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

describe("calculateBodyFatMass", () => {
  it("体重と体脂肪率から体脂肪量を求める", () => {
    expect(calculateBodyFatMass(70, 20)).toBeCloseTo(14)
  })

  it("どちらかが未記録ならnullを返す", () => {
    expect(calculateBodyFatMass(70, null)).toBeNull()
    expect(calculateBodyFatMass(null, 20)).toBeNull()
  })
})

describe("getGoalGap", () => {
  it("範囲目標は範囲外の近い境界までの差を符号付きで返す", () => {
    const target = goals.targets.weight
    expect(getGoalGap(70, target)).toBeCloseTo(-1.5)
    expect(getGoalGap(66.5, target)).toBeCloseTo(1)
    expect(getGoalGap(67.5, target)).toBe(0)
    expect(getGoalGap(68.5, target)).toBe(0)
  })

  it("上限目標は超過分だけ減らす必要がある", () => {
    expect(getGoalGap(21.9, goals.targets.bodyFat)).toBeCloseTo(-2)
    expect(getGoalGap(19.9, goals.targets.bodyFat)).toBe(0)
    expect(getGoalGap(18, goals.targets.bodyFat)).toBe(0)
  })

  it("下限目標は不足分だけ増やす必要がある", () => {
    expect(getGoalGap(30.3, goals.targets.muscleMass)).toBeCloseTo(1)
    expect(getGoalGap(31.3, goals.targets.muscleMass)).toBe(0)
  })
})

describe("getBodyCompositionGoalProgress", () => {
  const logs = [
    log("2026-11-01", { weight: 72, bodyFat: 25, muscleMass: 29.3 }),
    log("2026-11-10", { weight: null, bodyFat: null, muscleMass: null }),
    log("2026-11-24", { weight: 70, bodyFat: 22.4, muscleMass: 30.3 }),
  ]

  it("期限までの残り日数を基準日から求める", () => {
    const progress = getBodyCompositionGoalProgress(logs, goals, "2026-11-25")
    expect(progress.deadline).toBe("2027-03-31")
    expect(progress.daysRemaining).toBe(126)
  })

  it("期限当日は0、期限超過は負の日数になる", () => {
    expect(
      getBodyCompositionGoalProgress(logs, goals, "2027-03-31").daysRemaining
    ).toBe(0)
    expect(
      getBodyCompositionGoalProgress(logs, goals, "2027-04-01").daysRemaining
    ).toBe(-1)
  })

  it("最新の記録から各指標の残りと達成を求める", () => {
    const progress = getBodyCompositionGoalProgress(logs, goals, "2026-11-25")
    const byMetric = Object.fromEntries(
      progress.metrics.map((metric) => [metric.metric, metric])
    )

    expect(progress.metrics.map((metric) => metric.metric)).toEqual([
      "weight",
      "bodyFat",
      "bodyFatMass",
      "muscleMass",
    ])

    expect(byMetric.weight.current).toEqual({ date: "2026-11-24", value: 70 })
    expect(byMetric.weight.remaining).toBeCloseTo(-1.5)
    expect(byMetric.weight.achieved).toBe(false)

    expect(byMetric.bodyFat.remaining).toBeCloseTo(-2.5)

    // 70kg×22.4%=15.68kg、目標13.5kg
    expect(byMetric.bodyFatMass.current?.value).toBeCloseTo(15.68)
    expect(byMetric.bodyFatMass.remaining).toBeCloseTo(-2.18)

    expect(byMetric.muscleMass.remaining).toBeCloseTo(1)
  })

  it("目標を満たした指標は達成で残り0になる", () => {
    const progress = getBodyCompositionGoalProgress(
      [log("2026-11-01", { weight: 70 }), log("2026-11-24", { weight: 68 })],
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.achieved).toBe(true)
    expect(weight?.remaining).toBe(0)
  })

  it("未記録の指標はnullを返す", () => {
    const progress = getBodyCompositionGoalProgress([], goals, "2026-11-25")

    for (const metric of progress.metrics) {
      expect(metric.current).toBeNull()
      expect(metric.remaining).toBeNull()
      expect(metric.achieved).toBe(false)
    }
  })

  it("記録の並び順に依存せず最新日を使う", () => {
    const progress = getBodyCompositionGoalProgress(
      logs.toReversed(),
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.current?.date).toBe("2026-11-24")
  })
})
