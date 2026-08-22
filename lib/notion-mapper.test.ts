import { describe, expect, test } from "vitest"
import {
  mapNotionPageToFitnessLog,
  mapNotionPageToWorkoutSet,
} from "./notion-mapper"
import { notionMapperPageFixtures } from "./notion-mapper-fixture"

describe("mapNotionPageToFitnessLog", () => {
  test("numberとrollup numberをFitnessLogへ正規化する", () => {
    expect(
      mapNotionPageToFitnessLog(notionMapperPageFixtures.days.numberAndRollup)
    ).toEqual({
      date: "2026-08-21",
      steps: 12_345,
      calories: 2_150,
      protein: 135,
      fat: 62,
      carbs: 240,
      weight: 71.4,
      bodyFat: 18.2,
      muscleMass: 54.8,
    })
  })

  test("legacy protein名からproteinを取得する", () => {
    expect(
      mapNotionPageToFitnessLog(notionMapperPageFixtures.days.legacyProtein)
    ).toEqual({
      date: "2026-08-22",
      steps: null,
      calories: null,
      protein: 128,
      fat: null,
      carbs: null,
      weight: null,
      bodyFat: null,
      muscleMass: null,
    })
  })

  test("無効な日付を含む行を除外する", () => {
    expect(
      mapNotionPageToFitnessLog(notionMapperPageFixtures.days.invalidDate)
    ).toBeNull()
  })
})

describe("mapNotionPageToWorkoutSet", () => {
  test("rich text重量とtitle日付をWorkoutSetへ正規化する", () => {
    expect(
      mapNotionPageToWorkoutSet(
        notionMapperPageFixtures.workouts.richTextWeightAndTitleDate
      )
    ).toEqual({
      date: "2026-08-20",
      category: "筋力",
      exercise: "ベンチプレス",
      weightKg: 82.5,
      reps: 8,
      setCount: 3,
    })
  })

  test("無効な重量を含む行を除外する", () => {
    expect(
      mapNotionPageToWorkoutSet(notionMapperPageFixtures.workouts.invalidWeight)
    ).toBeNull()
  })
})
