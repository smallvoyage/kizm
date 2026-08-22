import { FitnessDataError, type FitnessDataSource } from "@/lib/fitness-data"

const DAYS_ERROR_MESSAGE = "Daysデータを取得できませんでした。"
const WORKOUTS_ERROR_MESSAGE = "Workoutsデータを取得できませんでした。"

export const allErrorFixtureFitnessDataSource = {
  async getDays() {
    throw new FitnessDataError(DAYS_ERROR_MESSAGE)
  },
  async getWorkouts() {
    throw new FitnessDataError(WORKOUTS_ERROR_MESSAGE)
  },
} satisfies FitnessDataSource
