import { describe, expect, it } from "vitest"
import {
  type FitnessLog,
  getNutritionAchievement,
  type NutritionMetric,
} from "@/lib/fitness"

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
  it("log自体がない場合はnoneを返す", () => {
    expect(getNutritionAchievement(null, goals)).toBe("none")
  })

  it("栄養値がすべてnullの場合はnoneを返す", () => {
    const log: FitnessLog = {
      ...completeLog,
      calories: null,
      protein: null,
      fat: null,
      carbs: null,
    }

    expect(getNutritionAchievement(log, goals)).toBe("none")
  })

  it.each<NutritionMetric>(["calories", "protein", "fat", "carbs"])(
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
