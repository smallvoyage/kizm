import type { BodyCompositionMetric, FitnessLog } from "./fitness"

export type CompositionPeriod = 7 | 30 | "all"

const COMPOSITION_POINT_SPACING = 44
export const COMPOSITION_EDGE_SPACE = 24
const metrics = ["weight", "bodyFat", "muscleMass"] as const

export function getCompositionWidth(count: number, viewportWidth: number) {
  return Math.max(
    viewportWidth,
    Math.max(0, count - 1) * COMPOSITION_POINT_SPACING +
      COMPOSITION_EDGE_SPACE * 2
  )
}

export function getCompositionPointX(
  index: number,
  count: number,
  width: number
) {
  if (count <= 1) return width / 2
  return (
    COMPOSITION_EDGE_SPACE +
    (index / (count - 1)) * (width - COMPOSITION_EDGE_SPACE * 2)
  )
}

export function getCompositionView(
  logs: FitnessLog[],
  referenceDate: string,
  period: CompositionPeriod,
  metric: BodyCompositionMetric,
  selectedDate: string | null
) {
  const start = new Date(`${referenceDate}T00:00:00Z`)
  if (period !== "all") start.setUTCDate(start.getUTCDate() - period + 1)
  const startDate = period === "all" ? "" : start.toISOString().slice(0, 10)
  const ordered = logs.toSorted((a, b) => a.date.localeCompare(b.date))
  const visibleLogs = ordered.filter(
    (log) => log.date >= startDate && log.date <= referenceDate
  )
  const selectableLogs = visibleLogs.filter((log) => log[metric] !== null)
  const selectedLog =
    selectableLogs.find((log) => log.date === selectedDate) ??
    selectableLogs.at(-1) ??
    null
  const summaries = Object.fromEntries(
    metrics.map((key) => {
      const value = selectedLog?.[key] ?? null
      const previous = selectedLog
        ? ordered.findLast(
            (log) => log.date < selectedLog.date && log[key] !== null
          )?.[key]
        : null
      return [
        key,
        {
          value,
          difference:
            value !== null && previous != null ? value - previous : null,
        },
      ]
    })
  ) as Record<
    BodyCompositionMetric,
    { value: number | null; difference: number | null }
  >
  const values = selectableLogs.map((log) => log[metric] as number)
  const min = values.length ? Math.min(...values) - 1 : 0
  const max = values.length ? Math.max(...values) + 1 : 2
  const ticks = [min, (min + max) / 2, max]

  return { visibleLogs, selectableLogs, selectedLog, summaries, ticks }
}

// The x-axis also contains dates where this metric is missing. Choose the
// closest measured record by plotted position; break ties towards the past.
export function getCompositionDateAt(
  logs: FitnessLog[],
  metric: BodyCompositionMetric,
  date: string
) {
  const index = logs.findIndex((log) => log.date === date)
  if (index < 0) return null
  for (let distance = 0; distance < logs.length; distance++) {
    for (const candidate of [logs[index - distance], logs[index + distance]]) {
      if (candidate && candidate[metric] !== null) return candidate.date
    }
  }
  return null
}
