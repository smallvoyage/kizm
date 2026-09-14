import { parseCalendarDate, shiftDate } from "@/lib/calendar-date"
import type { FitnessLog, NutritionMetric } from "@/lib/fitness"

type ComparisonStatus =
  | "comparable"
  | "no-eligible-days"
  | "no-current-data"
  | "in-progress"
  | "incomplete-current"
  | "insufficient-previous"
  | "invalid-records"

type ExcludedRecord = {
  date: string
  reason: "duplicate" | "invalid-value"
}

type NutritionAverage = {
  value: number | null
  recordedDays: number
  excludedRecords: ExcludedRecord[]
}

export type WeeklyNutritionAverage = NutritionAverage & {
  previous: NutritionAverage
  previousDifference: number | null
  comparisonStatus: ComparisonStatus
}

export type WeeklyNutrition = {
  startDate: string
  endDate: string
  eligibleEndDate: string | null
  eligibleDays: number
  previousEligibleDays: number
  isComplete: boolean
  averages: Record<NutritionMetric, WeeklyNutritionAverage>
}

function getEligibleDates(startDate: string, referenceDate: string): string[] {
  return Array.from({ length: 7 }, (_, day) =>
    shiftDate(startDate, day)
  ).filter((date): date is string => date !== null && date < referenceDate)
}

function getAverage(
  logsByDate: Map<string, FitnessLog[]>,
  dates: string[],
  metric: NutritionMetric
): NutritionAverage {
  const values: number[] = []
  const excludedRecords: ExcludedRecord[] = []

  for (const date of dates) {
    const dailyValues = (logsByDate.get(date) ?? [])
      .map((log) => log[metric])
      .filter((value) => value !== null)

    if (dailyValues.some((value) => !Number.isFinite(value) || value < 0)) {
      excludedRecords.push({ date, reason: "invalid-value" })
    } else if (dailyValues.length > 1) {
      excludedRecords.push({ date, reason: "duplicate" })
    } else if (dailyValues.length === 1) {
      values.push(dailyValues[0])
    }
  }

  return {
    // An incremental mean avoids overflowing the sum of finite daily values.
    value: values.length
      ? values.reduce(
          (mean, value, index) => mean + (value - mean) / (index + 1),
          0
        )
      : null,
    recordedDays: values.length,
    excludedRecords,
  }
}

function getComparisonStatus(
  current: NutritionAverage,
  previous: NutritionAverage,
  eligibleDays: number
): ComparisonStatus {
  if (current.excludedRecords.length || previous.excludedRecords.length) {
    return "invalid-records"
  }
  if (eligibleDays === 0) return "no-eligible-days"
  if (current.recordedDays === 0) return "no-current-data"
  if (eligibleDays < 7) return "in-progress"
  if (current.recordedDays < 7) return "incomplete-current"
  if (previous.recordedDays < 7) return "insufficient-previous"
  return "comparable"
}

export function getWeeklyNutrition(
  logs: FitnessLog[],
  weekStart: string,
  referenceDate: string
): WeeklyNutrition | null {
  const start = parseCalendarDate(weekStart)
  const endDate = shiftDate(weekStart, 6)
  const previousStart = shiftDate(weekStart, -7)
  if (
    start?.getUTCDay() !== 1 ||
    !parseCalendarDate(referenceDate) ||
    !endDate ||
    !previousStart
  ) {
    return null
  }

  const dates = getEligibleDates(weekStart, referenceDate)
  const previousDates = getEligibleDates(previousStart, referenceDate)
  const logsByDate = new Map<string, FitnessLog[]>()
  for (const log of logs) {
    const entries = logsByDate.get(log.date) ?? []
    entries.push(log)
    logsByDate.set(log.date, entries)
  }

  function getMetricAverage(metric: NutritionMetric): WeeklyNutritionAverage {
    const current = getAverage(logsByDate, dates, metric)
    const previous = getAverage(logsByDate, previousDates, metric)
    const comparisonStatus = getComparisonStatus(
      current,
      previous,
      dates.length
    )
    return {
      ...current,
      previous,
      comparisonStatus,
      previousDifference:
        comparisonStatus === "comparable" &&
        current.value !== null &&
        previous.value !== null
          ? current.value - previous.value
          : null,
    }
  }

  return {
    startDate: weekStart,
    endDate,
    eligibleEndDate: dates.at(-1) ?? null,
    eligibleDays: dates.length,
    previousEligibleDays: previousDates.length,
    isComplete: endDate < referenceDate,
    averages: {
      calories: getMetricAverage("calories"),
      protein: getMetricAverage("protein"),
      fat: getMetricAverage("fat"),
      carbs: getMetricAverage("carbs"),
    },
  }
}
