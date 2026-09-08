import {
  getWorkoutSetsWithRecords,
  type WorkoutSet,
  type WorkoutSetWithRecord,
} from "../fitness"

export type TrainingRecord = {
  date: string
  groups: { exercise: string; sets: WorkoutSetWithRecord[] }[]
  setCount: number
}

export function getTrainingRecord(
  history: WorkoutSet[],
  date: string
): TrainingRecord {
  const groups = new Map<string, WorkoutSetWithRecord[]>()
  let setCount = 0

  for (const set of getWorkoutSetsWithRecords(history, date)) {
    const sets = groups.get(set.exercise) ?? []
    for (let index = 0; index < set.setCount; index += 1) {
      sets.push({
        ...set,
        isEstimatedOneRepMaxRecord:
          index === 0 && set.isEstimatedOneRepMaxRecord,
      })
      setCount += 1
    }
    groups.set(set.exercise, sets)
  }

  return {
    date,
    groups: [...groups].map(([exercise, sets]) => ({ exercise, sets })),
    setCount,
  }
}
