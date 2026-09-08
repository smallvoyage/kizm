import type { FitnessLog, WorkoutSet } from "@/lib/fitness"

export type DaysResult = {
  logs: FitnessLog[]
  hasOlderLogs: boolean
  /** 表示期間の基準日（YYYY-MM-DD）。省略時は現在の日本時間を使う。 */
  referenceDate?: string
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
