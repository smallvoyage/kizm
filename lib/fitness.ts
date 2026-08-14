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

export type WorkoutSet = {
  date: string
  exercise: string
  weightKg: number
  reps: number
}

export type RepresentativeWorkoutSet = WorkoutSet & {
  estimatedOneRepMax: number
}

export type PerformanceTrend = "growth" | "maintained" | "lower"

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

export function calculateEstimatedOneRepMax(
  weightKg: number,
  reps: number
): number {
  return weightKg * (1 + reps / 30)
}

export function getExerciseNames(workoutSets: WorkoutSet[]): string[] {
  const latestDateByExercise = new Map<string, string>()

  for (const set of workoutSets) {
    const latestDate = latestDateByExercise.get(set.exercise)
    if (!latestDate || set.date > latestDate) {
      latestDateByExercise.set(set.exercise, set.date)
    }
  }

  return [...latestDateByExercise]
    .toSorted(
      ([exerciseA, dateA], [exerciseB, dateB]) =>
        dateB.localeCompare(dateA) || exerciseA.localeCompare(exerciseB, "ja")
    )
    .map(([exercise]) => exercise)
}

export function getRepresentativeWorkoutSets(
  workoutSets: WorkoutSet[],
  exercise: string
): RepresentativeWorkoutSet[] {
  const representativeByDate = new Map<string, RepresentativeWorkoutSet>()

  for (const set of workoutSets) {
    if (set.exercise !== exercise) continue

    const candidate = {
      ...set,
      estimatedOneRepMax: calculateEstimatedOneRepMax(set.weightKg, set.reps),
    }
    const current = representativeByDate.get(set.date)

    if (
      !current ||
      candidate.estimatedOneRepMax > current.estimatedOneRepMax ||
      (candidate.estimatedOneRepMax === current.estimatedOneRepMax &&
        candidate.weightKg > current.weightKg)
    ) {
      representativeByDate.set(set.date, candidate)
    }
  }

  return [...representativeByDate.values()].toSorted((a, b) =>
    a.date.localeCompare(b.date)
  )
}

export function compareWorkoutPerformance(
  current: RepresentativeWorkoutSet,
  previous: RepresentativeWorkoutSet
): PerformanceTrend {
  if (current.estimatedOneRepMax > previous.estimatedOneRepMax) return "growth"
  if (current.estimatedOneRepMax < previous.estimatedOneRepMax) return "lower"
  return "maintained"
}

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
