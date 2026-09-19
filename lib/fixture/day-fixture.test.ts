import { describe, expect, it } from "vitest"
import {
  allErrorFixtureFitnessDataSource,
  emptyFixtureFitnessDataSource,
  fixtureFitnessDataSource,
  missingNutritionFixtureFitnessDataSource,
  workoutsErrorFixtureFitnessDataSource,
} from "./index"

describe("fixture getDay", () => {
  it("指定日だけを返し、返却値の変更が次回取得に影響しない", async () => {
    const first = await fixtureFitnessDataSource.getDay("2026-08-15")
    expect(first?.date).toBe("2026-08-15")
    if (first) first.calories = -1
    expect(
      (await fixtureFitnessDataSource.getDay("2026-08-15"))?.calories
    ).toBeGreaterThan(0)
    expect(await fixtureFitnessDataSource.getDay("2026-09-19")).toBeNull()
  })
  it("空・未入力・エラーの各シナリオを保持する", async () => {
    expect(await emptyFixtureFitnessDataSource.getDay()).toBeNull()
    expect(
      (await missingNutritionFixtureFitnessDataSource.getDay("2026-08-15"))
        ?.protein
    ).toBeNull()
    expect(
      (await missingNutritionFixtureFitnessDataSource.getDay("2026-08-14"))
        ?.calories
    ).toBeNull()
    expect(
      await missingNutritionFixtureFitnessDataSource.getDay("2026-09-19")
    ).toBeNull()
    expect(
      (await workoutsErrorFixtureFitnessDataSource.getDay("2026-08-15"))?.date
    ).toBe("2026-08-15")
    await expect(allErrorFixtureFitnessDataSource.getDay()).rejects.toThrow(
      "Days"
    )
  })
})
