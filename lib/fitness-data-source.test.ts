import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
  const fixtureFitnessDataSource = {
    getDays: vi.fn(),
    getWorkouts: vi.fn(),
  }
  const notionFitnessDataSource = {
    getDays: vi.fn(),
    getWorkouts: vi.fn(),
  }

  return {
    fixtureFitnessDataSource,
    notionFitnessDataSource,
    resolveFitnessDataSource: vi.fn(() => "notion"),
    resolveFitnessFixtureScenario: vi.fn(() => "normal"),
  }
})

vi.mock("server-only", () => ({}))
vi.mock("@/lib/fitness-data-source-config", () => ({
  resolveFitnessDataSource: mocks.resolveFitnessDataSource,
  resolveFitnessFixtureScenario: mocks.resolveFitnessFixtureScenario,
}))
vi.mock("@/lib/fixture", () => ({
  allErrorFixtureFitnessDataSource: mocks.fixtureFitnessDataSource,
  emptyFixtureFitnessDataSource: mocks.fixtureFitnessDataSource,
  fixtureFitnessDataSource: mocks.fixtureFitnessDataSource,
  missingNutritionFixtureFitnessDataSource: mocks.fixtureFitnessDataSource,
  workoutsErrorFixtureFitnessDataSource: mocks.fixtureFitnessDataSource,
}))
vi.mock("@/lib/notion", () => ({
  notionFitnessDataSource: mocks.notionFitnessDataSource,
}))

import { fitnessDataSource } from "./fitness-data-source"

describe("fitnessDataSource", () => {
  it("通常起動ではNotion adapterを共通データ取得契約として公開する", () => {
    expect(mocks.resolveFitnessDataSource).toHaveBeenCalledWith(process.env)
    expect(fitnessDataSource).toBe(mocks.notionFitnessDataSource)
    expect(mocks.resolveFitnessFixtureScenario).not.toHaveBeenCalled()
  })
})
