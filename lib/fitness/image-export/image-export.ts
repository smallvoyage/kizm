import {
  type FitnessLog,
  getWorkoutSetsWithRecords,
  type WorkoutSet,
  type WorkoutSetWithRecord,
} from "../fitness"

export type WorkoutGroup = {
  exercise: string
  sets: WorkoutSetWithRecord[]
}

export function getExportDates(records: { date: string }[]): string[] {
  return [...new Set(records.map((record) => record.date))].sort((a, b) =>
    b.localeCompare(a)
  )
}

export function getDailyExportLog(logs: FitnessLog[], date: string) {
  return logs.findLast((log) => log.date === date) ?? null
}

export function getTrainingExportGroups(
  history: WorkoutSet[],
  date: string
): WorkoutGroup[] {
  const groups = new Map<string, WorkoutSetWithRecord[]>()
  for (const set of getWorkoutSetsWithRecords(history, date)) {
    const sets = groups.get(set.exercise) ?? []
    sets.push(
      ...Array.from({ length: set.setCount }, (_, index) => ({
        ...set,
        isEstimatedOneRepMaxRecord:
          index === 0 && set.isEstimatedOneRepMaxRecord,
      }))
    )
    groups.set(set.exercise, sets)
  }
  return [...groups].map(([exercise, sets]) => ({ exercise, sets }))
}
