import type { FitnessDataSource } from "@/lib/fitness-data"

export const emptyFixtureFitnessDataSource = {
  async getDays() {
    return {
      logs: [],
      hasOlderLogs: false,
    }
  },
  async getWorkouts() {
    return []
  },
} satisfies FitnessDataSource
