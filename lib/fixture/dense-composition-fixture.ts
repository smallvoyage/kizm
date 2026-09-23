import type { FitnessLog } from "@/lib/fitness"
import type { FitnessDataSource } from "@/lib/fitness-data"

import { fixtureFitnessDataSource } from "./fixture"

export const denseCompositionFixtureFitnessDataSource = {
  async getDay(date: string): Promise<FitnessLog | null> {
    const days = await denseCompositionFixtureFitnessDataSource.getDays()
    return days.logs.find((log) => log.date === date) ?? null
  },
  async getDays() {
    const days = await fixtureFitnessDataSource.getDays()
    const template = days.logs[0]
    return {
      ...days,
      logs: Array.from({ length: 90 }, (_, index) => {
        const date = new Date("2026-05-26T00:00:00Z")
        date.setUTCDate(date.getUTCDate() + index)
        return {
          ...template,
          date: date.toISOString().slice(0, 10),
          weight: index % 10 === 0 ? null : 70 - index * 0.02,
          // A single recent point and a metric absent from the recent period.
          bodyFat: index === 89 ? 18 : null,
          muscleMass: index === 0 ? 30 : null,
        }
      }),
    }
  },
  getWorkouts: fixtureFitnessDataSource.getWorkouts,
} satisfies FitnessDataSource
