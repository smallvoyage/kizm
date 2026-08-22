import { FitnessDataError, type FitnessDataSource } from "@/lib/fitness-data"

import { fixtureFitnessDataSource } from "./fixture"

export const workoutsErrorFixtureFitnessDataSource = {
  getDays: fixtureFitnessDataSource.getDays,
  async getWorkouts() {
    throw new FitnessDataError("FixtureのWorkouts取得に失敗しました。")
  },
} satisfies FitnessDataSource
