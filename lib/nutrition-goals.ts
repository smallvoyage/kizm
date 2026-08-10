import "server-only"

import type { NutritionMetric } from "@/lib/fitness"

export type NutritionGoals = Record<NutritionMetric, number>

const DEFAULT_GOALS: NutritionGoals = {
  calories: 2000,
  protein: 150,
  fat: 60,
  carbs: 250,
}

const ENVIRONMENT_VARIABLES: Record<NutritionMetric, string> = {
  calories: "NUTRITION_GOAL_CALORIES",
  protein: "NUTRITION_GOAL_PROTEIN_G",
  fat: "NUTRITION_GOAL_FAT_G",
  carbs: "NUTRITION_GOAL_CARBS_G",
}

export function getNutritionGoals(): NutritionGoals {
  return Object.fromEntries(
    Object.entries(ENVIRONMENT_VARIABLES).map(([metric, variable]) => {
      const configuredValue = Number(process.env[variable])
      const key = metric as NutritionMetric
      const value =
        Number.isFinite(configuredValue) && configuredValue > 0
          ? configuredValue
          : DEFAULT_GOALS[key]

      return [key, value]
    })
  ) as NutritionGoals
}
