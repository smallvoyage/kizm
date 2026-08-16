import { describe, expect, test } from "vitest"
import { getExerciseGroups, type WorkoutSet } from "@/lib/fitness"

function workoutSet(
  exercise: string,
  date: string,
  category = "筋力トレーニング"
): WorkoutSet {
  return {
    date,
    category,
    exercise,
    weightKg: 60,
    reps: 10,
    setCount: 3,
  }
}

describe("getExerciseGroups", () => {
  test("種目を最終実施日の降順に並べる", () => {
    const groups = getExerciseGroups([
      workoutSet("スクワット", "2026-08-10"),
      workoutSet("ベンチプレス", "2026-08-12"),
      workoutSet("デッドリフト", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual([
      "デッドリフト",
      "ベンチプレス",
      "スクワット",
    ])
  })

  test("最終実施日が同じ種目は日本語名の昇順に並べる", () => {
    const groups = getExerciseGroups([
      workoutSet("ベンチプレス", "2026-08-14"),
      workoutSet("スクワット", "2026-08-14"),
      workoutSet("アームカール", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual([
      "アームカール",
      "スクワット",
      "ベンチプレス",
    ])
  })

  test("同じ種目の複数セットを最新の記録1件にまとめる", () => {
    const groups = getExerciseGroups([
      workoutSet("スクワット", "2026-08-10"),
      workoutSet("ベンチプレス", "2026-08-12"),
      workoutSet("スクワット", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual(["スクワット", "ベンチプレス"])
  })
})
