import { describe, expect, test } from "vitest"
import {
  type FitnessLog,
  getExerciseGroups,
  getNutritionAchievement,
  type NutritionMetric,
  type WorkoutSet,
} from "./fitness"

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

const goals: Record<NutritionMetric, number> = {
  calories: 1800,
  protein: 140,
  fat: 50,
  carbs: 200,
}

const completeLog: FitnessLog = {
  date: "2026-08-17",
  steps: null,
  calories: goals.calories,
  protein: goals.protein,
  fat: goals.fat,
  carbs: goals.carbs,
  weight: null,
  bodyFat: null,
  muscleMass: null,
}

describe("getNutritionAchievement", () => {
  test("log自体がない場合はnoneを返す", () => {
    expect(getNutritionAchievement(null, goals)).toBe("none")
  })

  test("栄養値がすべてnullの場合はnoneを返す", () => {
    const log: FitnessLog = {
      ...completeLog,
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
    }

    expect(getNutritionAchievement(log, goals)).toBe("none")
  })

  test.each<NutritionMetric>(["calories", "protein", "fat", "carbs"])(
    "%sだけがnullの場合はmissedを返す",
    (missingMetric) => {
      const log: FitnessLog = {
        ...completeLog,
        [missingMetric]: null,
      }

      expect(getNutritionAchievement(log, goals)).toBe("missed")
    }
  )
})
