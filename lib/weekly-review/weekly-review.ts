import type {
  BodyCompositionMetric,
  FitnessLog,
  NutritionMetric,
} from "@/lib/fitness"
import { parseCalendarDate } from "@/lib/calendar-date/calendar-date"

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export type WeeklyAverage = {
  value: number | null
  previousDifference: number | null
  recordedDays: number
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
  }
  bodyComposition: {
    weight: WeeklyMetricChange
    weightAverage: WeeklyAverage
    bodyFat: WeeklyMetricChange
    muscleMass: WeeklyMetricChange
    recordedDays: number
  }
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function getWeekStart(date: string): string | null {
  const parsed = parseCalendarDate(date)
  if (!parsed) return null

  const daysSinceMonday = (parsed.getUTCDay() + 6) % 7
  parsed.setUTCDate(parsed.getUTCDate() - daysSinceMonday)
  return formatDate(parsed)
}

export function shiftDate(date: string, days: number): string | null {
  const parsed = parseCalendarDate(date)
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
  weekStart: string
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
