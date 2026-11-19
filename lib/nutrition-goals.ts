import "server-only"

import type { NutritionMetric } from "@/lib/fitness"

export type NutritionGoals = Record<NutritionMetric, number>

export const NUTRITION_GOALS: NutritionGoals = {
  calories: 2100,
  protein: 130,
  fat: 60,
  carbs: 260,
}
