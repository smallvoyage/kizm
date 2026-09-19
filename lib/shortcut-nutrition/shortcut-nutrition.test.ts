import { expect, it } from "vitest"
import { getDailyNutrition } from "@/lib/fitness/daily-nutrition/daily-nutrition"
import { formatShortcutNutrition } from "./shortcut-nutrition"

const goals = { calories: 1800, protein: 140, fat: 50, carbs: 200 }
const now = new Date("2026-09-19T09:35:00Z")

it("Watch向けに摂取量、超過、達成、未入力を整形する", () => {
  const summary = getDailyNutrition(
    {
      date: "2026-09-19",
      calories: 1450,
      protein: null,
      fat: 60,
      carbs: 200,
      steps: null,
      weight: null,
      bodyFat: null,
      muscleMass: null,
    },
    "2026-09-19",
    goals
  )
  expect(formatShortcutNutrition(summary, now)).toBe(
    "今日の食事 (2026-09-19)\n\nカロリー 1,450 kcal\n残り 350 kcal\n\nP 記録なし\n\nF 60 g\n10 g超過\n\nC 200 g\n目標達成\n\n取得 18:35"
  )
})

it("記録がない場合は摂取ゼロや目標全量の残りを表示しない", () => {
  expect(
    formatShortcutNutrition(getDailyNutrition(null, "2026-09-19", goals), now)
  ).toBe("今日の食事 (2026-09-19)\n\n今日はまだ記録がありません\n\n取得 18:35")
})
