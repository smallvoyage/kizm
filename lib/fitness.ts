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

export function getLatestNutritionLog(logs: FitnessLog[]): FitnessLog | null {
  return (
    logs.findLast((log) =>
      (["calories", "protein", "fat", "carbs"] as const).some(
        (metric) => log[metric] !== null
      )
    ) ?? null
  )
}
