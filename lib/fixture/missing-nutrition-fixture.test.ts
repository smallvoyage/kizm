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

test("通常fixtureの固定基準日を引き継ぐ", async () => {
  await expect(
    missingNutritionFixtureFitnessDataSource.getDays()
  ).resolves.toMatchObject({
    referenceDate: "2026-08-23",
  })
})
