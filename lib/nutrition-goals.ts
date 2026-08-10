import "server-only"

import type { NutritionMetric } from "@/lib/fitness"

export type NutritionGoals = Record<NutritionMetric, number>

export const NUTRITION_GOALS: NutritionGoals = {
  calories: 1800,
  protein: 140,
  fat: 50,
  carbs: 200,
}
