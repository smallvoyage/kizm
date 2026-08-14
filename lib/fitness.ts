export type FitnessLog = {
  date: string
  steps: number | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
}

export type BodyCompositionMetric = "weight" | "bodyFat" | "muscleMass"
export type NutritionMetric = "calories" | "protein" | "fat" | "carbs"
export type NutritionAchievement =
  | "none"
  | "missed"
  | "partial"
  | "near"
  | "achieved"

const NUTRITION_METRICS: NutritionMetric[] = [
  "calories",
  "protein",
  "fat",
  "carbs",
]

export function getLatestNutritionLog(logs: FitnessLog[]): FitnessLog | null {
  return (
    logs.findLast((log) =>
      NUTRITION_METRICS.some((metric) => log[metric] !== null)
    ) ?? null
  )
}
export function hasNutritionData(log: FitnessLog | null): boolean {
  return (
    log !== null && NUTRITION_METRICS.some((metric) => log[metric] !== null)
  )
}

export function getNutritionAchievement(
  log: FitnessLog | null,
  goals: Record<NutritionMetric, number>
): NutritionAchievement {
  if (!log || !hasNutritionData(log)) return "none"

  const { calories, protein, fat, carbs } = log
  if (calories === null || protein === null || fat === null || carbs === null) {
    return "missed"
  }

  const calorieRatio = calories / goals.calories
  const macroRatios = [
    protein / goals.protein,
    fat / goals.fat,
    carbs / goals.carbs,
  ]
  const caloriesAchieved = calorieRatio >= 0.9 && calorieRatio <= 1.1
  const macrosAchieved = macroRatios.every((ratio) => ratio >= 1)

  if (caloriesAchieved && macrosAchieved) return "achieved"

  const caloriesNear = calorieRatio >= 0.8 && calorieRatio <= 1.2
  const macrosNear = macroRatios.every((ratio) => ratio >= 0.8)
  if (caloriesNear && macrosNear) return "near"

  const caloriesPartial = calorieRatio >= 0.6 && calorieRatio <= 1.4
  const macrosPartial = macroRatios.every((ratio) => ratio >= 0.6)
  return caloriesPartial && macrosPartial ? "partial" : "missed"
}
