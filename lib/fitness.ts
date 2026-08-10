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
export type ChartPeriod = "7D" | "30D" | "90D" | "ALL"

export type MetricSummary = {
  value: number | null
  difference: number | null
  date: string | null
}

const PERIOD_DAYS: Record<Exclude<ChartPeriod, "ALL">, number> = {
  "7D": 7,
  "30D": 30,
  "90D": 90,
}

function toUtcDay(date: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null

  const [, year, month, day] = match
  return Date.UTC(Number(year), Number(month) - 1, Number(day))
}

export function getMetricSummary(
  logs: FitnessLog[],
  metric: BodyCompositionMetric
): MetricSummary {
  const validLogs = logs.filter((log) => log[metric] !== null)
  const latest = validLogs.at(-1)
  const previous = validLogs.at(-2)

  if (!latest || latest[metric] === null) {
    return { value: null, difference: null, date: null }
  }

  return {
    value: latest[metric],
    difference:
      previous && previous[metric] !== null
        ? latest[metric] - previous[metric]
        : null,
    date: latest.date,
  }
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
