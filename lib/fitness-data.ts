import type { FitnessLog, WorkoutSet } from "@/lib/fitness"

export type DaysResult = {
  logs: FitnessLog[]
  hasOlderLogs: boolean
}

export interface FitnessDataSource {
  getDays(): Promise<DaysResult>
  getWorkouts(): Promise<WorkoutSet[]>
}

export class FitnessDataError extends Error {
  constructor(
    public readonly userMessage: string,
    options?: ErrorOptions
  ) {
    super(userMessage, options)
    this.name = "FitnessDataError"
  }
}
