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
export type ChartPeriod = "7D" | "30D" | "90D" | "ALL"
export type NutritionAchievement = "none" | "missed" | "near" | "achieved"

export type MetricSummary = {
  value: number | null
  difference: number | null
}

export type BodyCompositionSummary = {
  date: string | null
  metrics: Record<BodyCompositionMetric, MetricSummary>
}

const PERIOD_DAYS: Record<Exclude<ChartPeriod, "ALL">, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
}

const NUTRITION_METRICS: NutritionMetric[] = [
  "calories",
  "protein",
  "fat",
  "carbs",
]

function toUtcDay(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null

  const [, year, month, day] = match
  return Date.UTC(Number(year), Number(month) - 1, Number(day))
}

export function getBodyCompositionSummary(
  logs: FitnessLog[]
): BodyCompositionSummary {
  const metrics: BodyCompositionMetric[] = ["weight", "bodyFat", "muscleMass"]
  const bodyCompositionLogs = logs.filter((log) =>
    metrics.some((metric) => log[metric] !== null)
  )
  const latest = bodyCompositionLogs.at(-1)
  const previous = bodyCompositionLogs.at(-2)

  return {
    date: latest?.date ?? null,
    metrics: Object.fromEntries(
      metrics.map((metric) => {
        const value = latest?.[metric] ?? null
        const previousValue = previous?.[metric] ?? null

        return [
          metric,
          {
            value,
            difference:
              value !== null && previousValue !== null
                ? value - previousValue
                : null,
          },
        ]
      })
    ) as Record<BodyCompositionMetric, MetricSummary>,
  }
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
  return caloriesNear && macrosNear ? "near" : "missed"
}

export function filterLogsByPeriod(
  logs: FitnessLog[],
  period: ChartPeriod,
  referenceDate: string
): FitnessLog[] {
  if (period === "ALL") return logs

  const referenceDay = toUtcDay(referenceDate)
  if (referenceDay === null) return []

  const millisecondsPerDay = 24 * 60 * 60 * 1000
  const firstDay = referenceDay - (PERIOD_DAYS[period] - 1) * millisecondsPerDay

  return logs.filter((log) => {
    const logDay = toUtcDay(log.date)
    return logDay !== null && logDay >= firstDay && logDay <= referenceDay
  })
}
