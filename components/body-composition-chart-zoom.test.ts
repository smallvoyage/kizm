import { describe, expect, test } from "vitest"

import {
  calculatePinchPointInterval,
  DEFAULT_CHART_POINT_INTERVAL,
  MAX_CHART_POINT_INTERVAL,
  MIN_CHART_POINT_INTERVAL,
} from "@/components/body-composition-chart-zoom"

describe("calculatePinchPointInterval", () => {
  test("ピンチアウトでは点の間隔を広げる", () => {
    expect(
      calculatePinchPointInterval({
        initialDistance: 100,
        currentDistance: 150,
        initialInterval: DEFAULT_CHART_POINT_INTERVAL,
      })
    ).toBe(84)
  })

  test("ピンチインでは点の間隔を狭める", () => {
    expect(
      calculatePinchPointInterval({
        initialDistance: 100,
        currentDistance: 50,
        initialInterval: DEFAULT_CHART_POINT_INTERVAL,
      })
    ).toBe(MIN_CHART_POINT_INTERVAL)
  })

  test("点の間隔を操作可能な範囲に収める", () => {
    expect(
      calculatePinchPointInterval({
        initialDistance: 10,
        currentDistance: 100,
        initialInterval: DEFAULT_CHART_POINT_INTERVAL,
      })
    ).toBe(MAX_CHART_POINT_INTERVAL)
  })

  test("距離が不正な場合は現在の間隔を維持する", () => {
    expect(
      calculatePinchPointInterval({
        initialDistance: 0,
        currentDistance: 100,
        initialInterval: DEFAULT_CHART_POINT_INTERVAL,
      })
    ).toBe(DEFAULT_CHART_POINT_INTERVAL)
  })
})
