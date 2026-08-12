import type {
  BodyCompositionMetric,
  FitnessLog,
  NutritionMetric,
} from "@/lib/fitness"
import type { NutritionGoals } from "@/lib/nutrition-goals"

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export type WeeklyAverage = {
  value: number | null
  previousDifference: number | null
  recordedDays: number
}

export type GoalAchievement = {
  achievedDays: number
  recordedDays: number
  rate: number | null
}

export type WeeklyMetricChange = {
  start: number | null
  end: number | null
  difference: number | null
}

export type WeeklyReview = {
  startDate: string
  endDate: string
  nutrition: {
    averages: Record<NutritionMetric, WeeklyAverage>
    calorieGoal: GoalAchievement
    proteinGoal: GoalAchievement
  }
  bodyComposition: {
    weight: WeeklyMetricChange
    weightAverage: WeeklyAverage
    bodyFat: WeeklyMetricChange
    muscleMass: WeeklyMetricChange
    recordedDays: number
  }
}

function parseDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null

  const parsed = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  )
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getWeekStart(date: string): string | null {
  const parsed = parseDate(date)
  if (!parsed) return null

  const daysSinceMonday = (parsed.getUTCDay() + 6) % 7
  parsed.setUTCDate(parsed.getUTCDate() - daysSinceMonday)
  return formatDate(parsed)
}

export function shiftDate(date: string, days: number): string | null {
  const parsed = parseDate(date)
  if (!parsed) return null

  return formatDate(new Date(parsed.getTime() + days * DAY_IN_MILLISECONDS))
}

function average(values: Array<number | null>): {
  value: number | null
  recordedDays: number
} {
  const recordedValues = values.filter(
    (value): value is number => value !== null
  )
  return {
    value:
      recordedValues.length === 0
        ? null
        : recordedValues.reduce((sum, value) => sum + value, 0) /
          recordedValues.length,
    recordedDays: recordedValues.length,
  }
}

function getAverage(
  logs: FitnessLog[],
  previousLogs: FitnessLog[],
  metric: NutritionMetric | BodyCompositionMetric
): WeeklyAverage {
  const current = average(logs.map((log) => log[metric]))
  const previous = average(previousLogs.map((log) => log[metric]))

  return {
    ...current,
    previousDifference:
      current.value !== null && previous.value !== null
        ? current.value - previous.value
        : null,
  }
}

function getGoalAchievement(
  logs: FitnessLog[],
  metric: "calories" | "protein",
  goal: number
): GoalAchievement {
  const values = logs
    .map((log) => log[metric])
    .filter((value): value is number => value !== null)
  const achievedDays = values.filter((value) =>
    metric === "calories" ? value <= goal : value >= goal
  ).length

  return {
    achievedDays,
    recordedDays: values.length,
    rate: values.length === 0 ? null : (achievedDays / values.length) * 100,
  }
}

function getMetricChange(
  logs: FitnessLog[],
  metric: BodyCompositionMetric
): WeeklyMetricChange {
  const values = logs
    .map((log) => log[metric])
    .filter((value): value is number => value !== null)
  const start = values.at(0) ?? null
  const end = values.at(-1) ?? null

  return {
    start,
    end,
    difference:
      start !== null && end !== null && values.length >= 2 ? end - start : null,
  }
}

function logsInRange(logs: FitnessLog[], startDate: string, endDate: string) {
  return logs.filter((log) => log.date >= startDate && log.date <= endDate)
}

export function getWeeklyReview(
  logs: FitnessLog[],
  weekStart: string,
  goals: NutritionGoals
): WeeklyReview | null {
  const endDate = shiftDate(weekStart, 6)
  const previousStartDate = shiftDate(weekStart, -7)
  const previousEndDate = shiftDate(weekStart, -1)
  if (!endDate || !previousStartDate || !previousEndDate) return null

  const weeklyLogs = logsInRange(logs, weekStart, endDate)
  const previousLogs = logsInRange(logs, previousStartDate, previousEndDate)
  const nutritionMetrics: NutritionMetric[] = [
    "calories",
    "protein",
    "fat",
    "carbs",
  ]
  const averages = Object.fromEntries(
    nutritionMetrics.map((metric) => [
      metric,
      getAverage(weeklyLogs, previousLogs, metric),
    ])
  ) as Record<NutritionMetric, WeeklyAverage>
  const bodyCompositionLogs = weeklyLogs.filter((log) =>
    (["weight", "bodyFat", "muscleMass"] as const).some(
      (metric) => log[metric] !== null
    )
  )

  return {
    startDate: weekStart,
    endDate,
    nutrition: {
      averages,
      calorieGoal: getGoalAchievement(weeklyLogs, "calories", goals.calories),
      proteinGoal: getGoalAchievement(weeklyLogs, "protein", goals.protein),
    },
    bodyComposition: {
      weight: getMetricChange(weeklyLogs, "weight"),
      weightAverage: getAverage(weeklyLogs, previousLogs, "weight"),
      bodyFat: getMetricChange(weeklyLogs, "bodyFat"),
      muscleMass: getMetricChange(weeklyLogs, "muscleMass"),
      recordedDays: bodyCompositionLogs.length,
    },
  }
}
