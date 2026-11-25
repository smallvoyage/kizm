import { describe, expect, test } from "vitest"

import { getNiceTicks } from "./chart-ticks"

describe("getNiceTicks", () => {
  test("値の範囲を余白付きで覆う等間隔の目盛りを返す", () => {
    expect(getNiceTicks([76, 78.8, 81.7, 85.5, 88.7])).toEqual([
      70, 75, 80, 85, 90, 95,
    ])
  })

  test("範囲が広いときは目盛り間隔を広げて5区間以内に収める", () => {
    expect(getNiceTicks([39.5, 59.5, 66.5])).toEqual([30, 40, 50, 60, 70, 80])
  })

  test("値が1つでも上下に余白を持たせる", () => {
    expect(getNiceTicks([60])).toEqual([59, 60, 61])
  })

  test("0を下回る目盛りは作らない", () => {
    expect(getNiceTicks([0.2, 1])).toEqual([0, 1, 2])
  })

  test("値が空なら目盛りも空にする", () => {
    expect(getNiceTicks([])).toEqual([])
  })
})
