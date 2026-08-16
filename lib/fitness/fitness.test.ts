import { describe, expect, test } from "vitest"
import {
  type FitnessLog,
  getExerciseGroups,
  getNutritionAchievement,
  type NutritionAchievement,
  type NutritionMetric,
  type WorkoutSet,
} from "./fitness"

const goals: Record<NutritionMetric, number> = {
  calories: 100,
  protein: 100,
  fat: 100,
  carbs: 100,
}

function createNutritionLog(overrides: Partial<FitnessLog> = {}): FitnessLog {
  return {
    date: "2026-08-17",
    steps: null,
    calories: 100,
    protein: 100,
    fat: 100,
    carbs: 100,
    weight: null,
    bodyFat: null,
    muscleMass: null,
    ...overrides,
  }
}

const calorieBoundaryCases: Array<[number, NutritionAchievement]> = [
  [59, "missed"],
  [60, "partial"],
  [61, "partial"],
  [79, "partial"],
  [80, "near"],
  [81, "near"],
  [89, "near"],
  [90, "achieved"],
  [91, "achieved"],
  [99, "achieved"],
  [100, "achieved"],
  [101, "achieved"],
  [109, "achieved"],
  [110, "achieved"],
  [111, "near"],
  [119, "near"],
  [120, "near"],
  [121, "partial"],
  [139, "partial"],
  [140, "partial"],
  [141, "missed"],
]

const macroBoundaryCases: Array<[number, NutritionAchievement]> = [
  [59, "missed"],
  [60, "partial"],
  [61, "partial"],
  [79, "partial"],
  [80, "near"],
  [81, "near"],
  [99, "near"],
  [100, "achieved"],
  [101, "achieved"],
]

describe("getNutritionAchievement", () => {
  test.each(calorieBoundaryCases)(
    "calories が目標の %i%% の場合は %s",
    (percentage, expected) => {
      expect(
        getNutritionAchievement(
          createNutritionLog({ calories: percentage }),
          goals
        )
      ).toBe(expected)
    }
  )

  describe.each(["protein", "fat", "carbs"] as const)(
    "%s の達成率",
    (metric) => {
      test.each(macroBoundaryCases)(
        "目標の %i%% の場合は %s",
        (percentage, expected) => {
          expect(
            getNutritionAchievement(
              createNutritionLog({ [metric]: percentage }),
              goals
            )
          ).toBe(expected)
        }
      )
    }
  )
})

function workoutSet(
  exercise: string,
  date: string,
  category = "筋力トレーニング"
): WorkoutSet {
  return {
    date,
    category,
    exercise,
    weightKg: 60,
    reps: 10,
    setCount: 3,
  }
}

describe("getExerciseGroups", () => {
  test("種目を最終実施日の降順に並べる", () => {
    const groups = getExerciseGroups([
      workoutSet("スクワット", "2026-08-10"),
      workoutSet("ベンチプレス", "2026-08-12"),
      workoutSet("デッドリフト", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual([
      "デッドリフト",
      "ベンチプレス",
      "スクワット",
    ])
  })

  test("最終実施日が同じ種目は日本語名の昇順に並べる", () => {
    const groups = getExerciseGroups([
      workoutSet("ベンチプレス", "2026-08-14"),
      workoutSet("スクワット", "2026-08-14"),
      workoutSet("アームカール", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual([
      "アームカール",
      "スクワット",
      "ベンチプレス",
    ])
  })

  test("同じ種目の複数セットを最新の記録1件にまとめる", () => {
    const groups = getExerciseGroups([
      workoutSet("スクワット", "2026-08-10"),
      workoutSet("ベンチプレス", "2026-08-12"),
      workoutSet("スクワット", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual(["スクワット", "ベンチプレス"])
  })
})
