import type { FitnessDataSource } from "@/lib/fitness-data"

import { fixtureFitnessDataSource } from "./fixture"

const ALL_NUTRITION_MISSING_DATE = "2026-08-14"
const PARTIAL_PFC_MISSING_DATE = "2026-08-15"

export const missingNutritionFixtureFitnessDataSource = {
  async getDays() {
    const days = await fixtureFitnessDataSource.getDays()

    return {
      ...days,
      logs: days.logs.map((log) => {
        // null は未入力を表し、摂取量が0だったことは表さない。
        if (log.date === ALL_NUTRITION_MISSING_DATE) {
          return {
            ...log,
            calories: null,
            protein: null,
            fat: null,
            carbs: null,
          }
        }

        if (log.date === PARTIAL_PFC_MISSING_DATE) {
          return {
            ...log,
            protein: null,
          }
        }

        return log
      }),
    }
  },
  async getWorkouts() {
    return fixtureFitnessDataSource.getWorkouts()
  },
} satisfies FitnessDataSource
