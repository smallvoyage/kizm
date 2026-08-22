import { expect, test } from "vitest"

import { missingNutritionFixtureFitnessDataSource } from "./missing-nutrition-fixture"

test("全栄養値が未入力の日を取得できる", async () => {
  const { logs } = await missingNutritionFixtureFitnessDataSource.getDays()
  const log = logs.find(({ date }) => date === "2026-08-14")

  expect(log).toMatchObject({
    calories: null,
    protein: null,
    fat: null,
    carbs: null,
  })
})

test("PFCの一部だけが未入力の日を取得できる", async () => {
  const { logs } = await missingNutritionFixtureFitnessDataSource.getDays()
  const log = logs.find(({ date }) => date === "2026-08-15")

  expect(log).toMatchObject({
    calories: expect.any(Number),
    protein: null,
    fat: expect.any(Number),
    carbs: expect.any(Number),
  })
})
