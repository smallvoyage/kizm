import type { FitnessDataSource } from "@/lib/fitness-data"

const FIXTURE_START_DATE = "2026-07-13"
const FIXTURE_LOG_DAYS = 35

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}

const fixtureLogs = Array.from({ length: FIXTURE_LOG_DAYS }, (_, index) => ({
  date: addDays(FIXTURE_START_DATE, index),
  steps: 7_500 + (index % 5) * 450,
  calories: 2_250 + (index % 4) * 80,
  protein: 145 + (index % 3) * 8,
  fat: 58 + (index % 4) * 3,
  carbs: 250 + (index % 5) * 12,
  weight: 68.8 - index * 0.04,
  bodyFat: 18.2 - index * 0.03,
  muscleMass: 30.4 + index * 0.02,
}))

const fixtureWorkoutDates = [
  "2026-07-19",
  "2026-07-26",
  "2026-08-02",
  "2026-08-09",
  "2026-08-16",
]

const fixtureWorkouts = fixtureWorkoutDates.flatMap((date, index) => [
  {
    date,
    category: "上半身",
    exercise: "ベンチプレス",
    weightKg: 60 + index * 2.5,
    reps: 8,
    setCount: 3,
  },
  {
    date,
    category: "上半身",
    exercise: "ラットプルダウン",
    weightKg: 50 + index * 2,
    reps: 10,
    setCount: 3,
  },
  {
    date,
    category: "下半身",
    exercise: "バックスクワット",
    weightKg: 80 + index * 5,
    reps: 6,
    setCount: 4,
  },
])

export const fixtureFitnessDataSource = {
  async getDays() {
    return {
      logs: fixtureLogs.map((log) => ({ ...log })),
      hasOlderLogs: false,
    }
  },
  async getWorkouts() {
    return fixtureWorkouts.map((workout) => ({ ...workout }))
  },
} satisfies FitnessDataSource
