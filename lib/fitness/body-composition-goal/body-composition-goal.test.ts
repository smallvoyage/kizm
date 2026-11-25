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

  it("最古と最新の記録から各指標の進捗を求める", () => {
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

    expect(byMetric.weight.baseline).toEqual({ date: "2026-11-01", value: 72 })
    expect(byMetric.weight.current).toEqual({ date: "2026-11-24", value: 70 })
    expect(byMetric.weight.remaining).toBeCloseTo(-1.5)
    expect(byMetric.weight.achieved).toBe(false)
    // 起点72→上限68.5まで3.5kgのうち2kg進んだ
    expect(byMetric.weight.progressRatio).toBeCloseTo(2 / 3.5)
    expect(byMetric.weight.requiredWeeklyChange).toBeCloseTo((-1.5 / 126) * 7)

    expect(byMetric.bodyFat.remaining).toBeCloseTo(-2.5)
    expect(byMetric.bodyFat.progressRatio).toBeCloseTo(2.6 / 5.1)

    // 72kg×25%=18kg → 70kg×22.4%=15.68kg、目標13.5kg
    expect(byMetric.bodyFatMass.baseline?.value).toBeCloseTo(18)
    expect(byMetric.bodyFatMass.current?.value).toBeCloseTo(15.68)
    expect(byMetric.bodyFatMass.remaining).toBeCloseTo(-2.18)
    expect(byMetric.bodyFatMass.progressRatio).toBeCloseTo(2.32 / 4.5)

    expect(byMetric.muscleMass.remaining).toBeCloseTo(1)
    expect(byMetric.muscleMass.progressRatio).toBeCloseTo(0.5)
    expect(byMetric.muscleMass.requiredWeeklyChange).toBeCloseTo((1 / 126) * 7)
  })

  it("達成済みの指標は進捗100%で必要ペースを返さない", () => {
    const progress = getBodyCompositionGoalProgress(
      [log("2026-11-01", { weight: 70 }), log("2026-11-24", { weight: 68 })],
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.achieved).toBe(true)
    expect(weight?.remaining).toBe(0)
    expect(weight?.progressRatio).toBe(1)
    expect(weight?.requiredWeeklyChange).toBeNull()
  })

  it("起点から目標と反対方向へ離れた場合は進捗0%にする", () => {
    const progress = getBodyCompositionGoalProgress(
      [
        log("2026-11-01", { muscleMass: 30.5 }),
        log("2026-11-24", { muscleMass: 30 }),
      ],
      goals,
      "2026-11-25"
    )
    const muscleMass = progress.metrics.find(
      (metric) => metric.metric === "muscleMass"
    )

    expect(muscleMass?.progressRatio).toBe(0)
  })

  it("起点で達成していて最新で未達になった場合は進捗0%にする", () => {
    const progress = getBodyCompositionGoalProgress(
      [log("2026-11-01", { weight: 68 }), log("2026-11-24", { weight: 69 })],
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.achieved).toBe(false)
    expect(weight?.progressRatio).toBe(0)
  })

  it("範囲の反対側へ行き過ぎた場合は進捗0%にする", () => {
    const progress = getBodyCompositionGoalProgress(
      [log("2026-11-01", { weight: 70 }), log("2026-11-24", { weight: 67 })],
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.remaining).toBeCloseTo(0.5)
    expect(weight?.progressRatio).toBe(0)
  })

  it("記録が1件だけなら起点と最新が同じで進捗0%になる", () => {
    const progress = getBodyCompositionGoalProgress(
      [log("2026-11-24", { weight: 70 })],
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.baseline).toEqual(weight?.current)
    expect(weight?.progressRatio).toBe(0)
  })

  it("達成数と全体の平均進捗を求める", () => {
    const progress = getBodyCompositionGoalProgress(
      [
        log("2026-11-01", { weight: 70, muscleMass: 29.3 }),
        log("2026-11-24", { weight: 68, muscleMass: 30.3 }),
      ],
      goals,
      "2026-11-25"
    )

    // 体重は達成（1.0）、骨格筋量は50%、体脂肪系は未記録で平均から除外
    expect(progress.achievedCount).toBe(1)
    expect(progress.overallProgressRatio).toBeCloseTo(0.75)
  })

  it("未記録の指標はnullを返す", () => {
    const progress = getBodyCompositionGoalProgress([], goals, "2026-11-25")

    expect(progress.achievedCount).toBe(0)
    expect(progress.overallProgressRatio).toBeNull()

    for (const metric of progress.metrics) {
      expect(metric.current).toBeNull()
      expect(metric.baseline).toBeNull()
      expect(metric.remaining).toBeNull()
      expect(metric.progressRatio).toBeNull()
      expect(metric.achieved).toBe(false)
    }
  })

  it("期限を過ぎたら必要ペースを返さない", () => {
    const progress = getBodyCompositionGoalProgress(logs, goals, "2027-04-01")

    expect(progress.daysRemaining).toBe(-1)
    for (const metric of progress.metrics) {
      expect(metric.requiredWeeklyChange).toBeNull()
    }
  })

  it("記録の並び順に依存しない", () => {
    const progress = getBodyCompositionGoalProgress(
      logs.toReversed(),
      goals,
      "2026-11-25"
    )
    const weight = progress.metrics.find((metric) => metric.metric === "weight")

    expect(weight?.baseline?.date).toBe("2026-11-01")
    expect(weight?.current?.date).toBe("2026-11-24")
  })
})
