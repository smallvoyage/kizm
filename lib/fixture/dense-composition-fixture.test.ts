import { expect, test } from "vitest"

import { denseCompositionFixtureFitnessDataSource } from "./dense-composition-fixture"

test("高密度・欠測・1点・期間内の空状態を再現し、呼び出し間で変更を共有しない", async () => {
  const first = await denseCompositionFixtureFitnessDataSource.getDays()
  expect(first.referenceDate).toBe("2026-08-23")
  expect(first.logs).toHaveLength(90)
  expect(first.logs[0].date).toBe("2026-05-26")
  expect(first.logs.at(-1)?.date).toBe("2026-08-23")
  expect(
    await denseCompositionFixtureFitnessDataSource.getDay("2026-08-23")
  ).toEqual(first.logs.at(-1))
  expect(
    await denseCompositionFixtureFitnessDataSource.getDay("2026-01-01")
  ).toBeNull()
  expect(first.logs.filter((log) => log.weight !== null)).toHaveLength(81)
  expect(first.logs.filter((log) => log.bodyFat !== null)).toHaveLength(1)
  expect(
    first.logs.filter((log) => log.muscleMass !== null).map((log) => log.date)
  ).toEqual(["2026-05-26"])
  first.logs[0].muscleMass = 999
  expect(
    (await denseCompositionFixtureFitnessDataSource.getDays()).logs[0]
      .muscleMass
  ).toBe(30)
})
