import type { FitnessLog, NutritionMetric } from "@/lib/fitness"

export function getTokyoDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function getDailyNutrition(
  log: FitnessLog | null,
  date: string,
  goals: Record<NutritionMetric, number>
) {
  const record = log?.date === date ? log : null
  const metric = (key: NutritionMetric) => {
    const consumed = record?.[key] ?? null
    return {
      consumed,
      goal: goals[key],
      remaining: consumed === null ? null : goals[key] - consumed,
    }
  }
  const metrics = {
    calories: metric("calories"),
    protein: metric("protein"),
    fat: metric("fat"),
    carbs: metric("carbs"),
  }
  const count = Object.values(metrics).filter(
    (value) => value.consumed !== null
  ).length
  return {
    date,
    status: count === 0 ? "empty" : count === 4 ? "complete" : "partial",
    metrics,
  } as const
}
