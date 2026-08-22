import { expect, test } from "vitest"

import { FitnessDataError } from "@/lib/fitness-data"

import { fixtureFitnessDataSource } from "./fixture"
import { workoutsErrorFixtureFitnessDataSource } from "./workouts-error-fixture"

test("Daysは通常表示用データを返し、Workoutsだけ決定論的に失敗する", async () => {
  await expect(
    workoutsErrorFixtureFitnessDataSource.getDays()
  ).resolves.toEqual(await fixtureFitnessDataSource.getDays())

  const firstError = await workoutsErrorFixtureFitnessDataSource
    .getWorkouts()
    .catch((error: unknown) => error)
  const secondError = await workoutsErrorFixtureFitnessDataSource
    .getWorkouts()
    .catch((error: unknown) => error)

  expect(firstError).toBeInstanceOf(FitnessDataError)
  expect(firstError).toMatchObject({
    name: "FitnessDataError",
    userMessage: "FixtureのWorkouts取得に失敗しました。",
  })
  expect(secondError).toMatchObject({
    name: "FitnessDataError",
    userMessage: "FixtureのWorkouts取得に失敗しました。",
  })
})
