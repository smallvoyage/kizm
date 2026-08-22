import { describe, expect, test } from "vitest"

import { FitnessDataError } from "@/lib/fitness-data"
import { allErrorFixtureFitnessDataSource } from "./all-error-fixture"

describe("allErrorFixtureFitnessDataSource", () => {
  test.each([
    [
      "Days",
      allErrorFixtureFitnessDataSource.getDays,
      "Daysデータを取得できませんでした。",
    ],
    [
      "Workouts",
      allErrorFixtureFitnessDataSource.getWorkouts,
      "Workoutsデータを取得できませんでした。",
    ],
  ])("%sが決定論的なエラーを返す", async (_, load, expectedMessage) => {
    const firstResult = await load().catch((error: unknown) => error)
    const secondResult = await load().catch((error: unknown) => error)

    expect(firstResult).toBeInstanceOf(FitnessDataError)
    expect(firstResult).toMatchObject({
      message: expectedMessage,
      userMessage: expectedMessage,
    })
    expect(secondResult).toMatchObject({
      message: expectedMessage,
      userMessage: expectedMessage,
    })
  })
})
