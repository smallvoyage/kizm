import { describe, expect, test } from "vitest"
import {
  type FitnessLog,
  getNutritionAchievement,
  type NutritionAchievement,
  type NutritionMetric,
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
