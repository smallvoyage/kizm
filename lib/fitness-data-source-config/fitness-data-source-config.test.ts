import { describe, expect, test } from "vitest"

import { resolveFitnessDataSource } from "./fitness-data-source-config"

describe("resolveFitnessDataSource", () => {
  test("未指定時はNotionを選ぶ", () => {
    expect(resolveFitnessDataSource({})).toBe("notion")
  })

  test("明示されたfixtureをdevelopmentで選ぶ", () => {
    expect(
      resolveFitnessDataSource({
        FITNESS_DATA_SOURCE: "fixture",
        NODE_ENV: "development",
      })
    ).toBe("fixture")
  })

  test("productionでは明示的な追加許可なしにfixtureを選べない", () => {
    expect(() =>
      resolveFitnessDataSource({
        FITNESS_DATA_SOURCE: "fixture",
        NODE_ENV: "production",
      })
    ).toThrow(/FITNESS_ALLOW_FIXTURE_IN_PRODUCTION=true/)
  })

  test("productionでも追加許可があればfixtureを選べる", () => {
    expect(
      resolveFitnessDataSource({
        FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
        FITNESS_DATA_SOURCE: "fixture",
        NODE_ENV: "production",
      })
    ).toBe("fixture")
  })

  test("未知のデータソース名を拒否する", () => {
    expect(() =>
      resolveFitnessDataSource({ FITNESS_DATA_SOURCE: "fixtures" })
    ).toThrow(/FITNESS_DATA_SOURCE/)
  })
})
