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
  category: string
  exercise: string
  weightKg: number
  reps: number
}

export type RepresentativeWorkoutSet = WorkoutSet & {
  estimatedOneRepMax: number
}

export type WorkoutSetWithRecord = WorkoutSet & {
  isEstimatedOneRepMaxRecord: boolean
}

export type PerformanceTrend = "growth" | "maintained" | "lower"

export type ExerciseGroup = {
  category: string
  exercises: string[]
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

function calculateEstimatedOneRepMax(weightKg: number, reps: number): number {
  return weightKg * (1 + reps / 30)
}

export function getExerciseGroups(workoutSets: WorkoutSet[]): ExerciseGroup[] {
  const latestSetByExercise = new Map<
    string,
    Pick<WorkoutSet, "category" | "date">
  >()

  for (const set of workoutSets) {
    const latestSet = latestSetByExercise.get(set.exercise)
    if (!latestSet || set.date > latestSet.date) {
      latestSetByExercise.set(set.exercise, {
        category: set.category,
        date: set.date,
      })
    }
  }

  const exercisesByCategory = new Map<
    string,
    { latestDate: string; exercises: Array<[string, string]> }
  >()

  for (const [exercise, { category, date }] of latestSetByExercise) {
    const group = exercisesByCategory.get(category)
    if (group) {
      group.latestDate = date > group.latestDate ? date : group.latestDate
      group.exercises.push([exercise, date])
    } else {
      exercisesByCategory.set(category, {
        latestDate: date,
        exercises: [[exercise, date]],
      })
    }
  }

  return [...exercisesByCategory]
    .toSorted(
      ([categoryA, groupA], [categoryB, groupB]) =>
        groupB.latestDate.localeCompare(groupA.latestDate) ||
        categoryA.localeCompare(categoryB, "ja")
    )
    .map(([category, group]) => ({
      category,
      exercises: group.exercises
        .toSorted(
          ([exerciseA, dateA], [exerciseB, dateB]) =>
            dateB.localeCompare(dateA) ||
            exerciseA.localeCompare(exerciseB, "ja")
        )
        .map(([exercise]) => exercise),
    }))
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

export function getWorkoutSetsWithRecords(
  workoutSets: WorkoutSet[],
  date: string
): WorkoutSetWithRecord[] {
  const previousMaxByExercise = new Map<string, number>()
  const currentBestByExercise = new Map<
    string,
    { index: number; estimatedOneRepMax: number }
  >()

  for (const set of workoutSets) {
    if (set.date >= date) continue

    const estimatedOneRepMax = calculateEstimatedOneRepMax(
      set.weightKg,
      set.reps
    )
    const previousMax = previousMaxByExercise.get(set.exercise)
    if (previousMax === undefined || estimatedOneRepMax > previousMax) {
      previousMaxByExercise.set(set.exercise, estimatedOneRepMax)
    }
  }

  const currentSets = workoutSets.filter((set) => set.date === date)
  currentSets.forEach((set, index) => {
    const estimatedOneRepMax = calculateEstimatedOneRepMax(
      set.weightKg,
      set.reps
    )
    const currentBest = currentBestByExercise.get(set.exercise)
    if (!currentBest || estimatedOneRepMax > currentBest.estimatedOneRepMax) {
      currentBestByExercise.set(set.exercise, { index, estimatedOneRepMax })
    }
  })

  return currentSets.map((set, index) => {
    const currentBest = currentBestByExercise.get(set.exercise)
    const previousMax = previousMaxByExercise.get(set.exercise)

    return {
      ...set,
      isEstimatedOneRepMaxRecord:
        currentBest?.index === index &&
        previousMax !== undefined &&
        currentBest.estimatedOneRepMax > previousMax,
    }
  })
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
