import { shiftDate } from "@/lib/calendar-date"
import type { BodyCompositionMetric, FitnessLog } from "@/lib/fitness"

import {
  getWeeklyNutrition,
  type WeeklyNutrition,
} from "@/lib/fitness/weekly-nutrition/weekly-nutrition"

type WeeklyAverage = {
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
  nutrition: WeeklyNutrition
  bodyComposition: {
    weight: WeeklyMetricChange
    weightAverage: WeeklyAverage
    bodyFat: WeeklyMetricChange
    muscleMass: WeeklyMetricChange
    recordedDays: number
  }
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
  metric: BodyCompositionMetric
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
  weekStart: string,
  referenceDate: string
): WeeklyReview | null {
  const endDate = shiftDate(weekStart, 6)
  const previousStartDate = shiftDate(weekStart, -7)
  const previousEndDate = shiftDate(weekStart, -1)
  const nutrition = getWeeklyNutrition(logs, weekStart, referenceDate)
  if (!endDate || !previousStartDate || !previousEndDate || !nutrition)
    return null

  const weeklyLogs = logsInRange(logs, weekStart, endDate)
  const previousLogs = logsInRange(logs, previousStartDate, previousEndDate)
  const bodyCompositionLogs = weeklyLogs.filter((log) =>
    (["weight", "bodyFat", "muscleMass"] as const).some(
      (metric) => log[metric] !== null
    )
  )

  return {
    startDate: weekStart,
    endDate,
    nutrition,
    bodyComposition: {
      weight: getMetricChange(weeklyLogs, "weight"),
      weightAverage: getAverage(weeklyLogs, previousLogs, "weight"),
      bodyFat: getMetricChange(weeklyLogs, "bodyFat"),
      muscleMass: getMetricChange(weeklyLogs, "muscleMass"),
      recordedDays: bodyCompositionLogs.length,
    },
  }
}
