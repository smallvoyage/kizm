import { describe, expect, test } from "vitest"

import { FitnessDataError } from "@/lib/fitness-data"
import {
  invalidNotionDataSourceFixtures,
  invalidNotionWorkoutPageFixtures,
} from "@/lib/notion-invalid-properties-fixture"
import { mapNotionPageToWorkoutSet } from "@/lib/notion-mapper"
import {
  validateDaysDataSourceSchema,
  validateWorkoutsDataSourceSchema,
} from "@/lib/notion-schema"

describe("invalidNotionDataSourceFixtures", () => {
  test("Daysの必須プロパティ欠落によるschema検証エラーを再現する", () => {
    const { properties } =
      invalidNotionDataSourceFixtures.daysMissingRequiredProperty

    expect(() => validateDaysDataSourceSchema(properties)).toThrowError(
      new FitnessDataError(
        "Notionに必要なプロパティがありません: Muscle Mass kg"
      )
    )
  })

  test("Workoutsの必須プロパティ欠落によるschema検証エラーを再現する", () => {
    const { properties } =
      invalidNotionDataSourceFixtures.workoutsMissingRequiredProperty

    expect(() => validateWorkoutsDataSourceSchema(properties)).toThrowError(
      new FitnessDataError(
        "NotionのWorkoutsに必要なプロパティがありません: Set Count"
      )
    )
  })

  test("Daysの必須プロパティ型不一致によるschema検証エラーを再現する", () => {
    const { properties } =
      invalidNotionDataSourceFixtures.daysMismatchedPropertyType

    expect(() => validateDaysDataSourceSchema(properties)).toThrowError(
      new FitnessDataError(
        "Notionプロパティの型を確認してください: Log Date (date)"
      )
    )
  })

  test("Workoutsの必須プロパティ型不一致によるschema検証エラーを再現する", () => {
    const { properties } =
      invalidNotionDataSourceFixtures.workoutsMismatchedPropertyType

    expect(() => validateWorkoutsDataSourceSchema(properties)).toThrowError(
      new FitnessDataError(
        "NotionのWorkoutsプロパティの型を確認してください: Reps (number)"
      )
    )
  })
})

describe("invalidNotionWorkoutPageFixtures", () => {
  test.each([
    ["不正な日付", invalidNotionWorkoutPageFixtures.invalidDate],
    [
      "数値として解釈できない重量",
      invalidNotionWorkoutPageFixtures.invalidWeight,
    ],
    ["0回の回数", invalidNotionWorkoutPageFixtures.invalidReps],
  ])("%sを含むWorkout行がmapperで除外される", (_caseName, page) => {
    expect(mapNotionPageToWorkoutSet(page)).toBeNull()
  })
})
