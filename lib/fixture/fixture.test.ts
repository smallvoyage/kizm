import { afterEach, expect, test, vi } from "vitest"

import { fixtureFitnessDataSource } from "./fixture"

test("決定論的な通常表示用データを取得できる", async () => {
  const first = await Promise.all([
    fixtureFitnessDataSource.getDays(),
    fixtureFitnessDataSource.getWorkouts(),
  ])
  const second = await Promise.all([
    fixtureFitnessDataSource.getDays(),
    fixtureFitnessDataSource.getWorkouts(),
  ])

  expect(second).toEqual(first)
  expect(first[0].logs).toHaveLength(35)
  expect(first[0].logs[0]?.date).toBe("2026-07-13")
  expect(first[0].logs.at(-1)?.date).toBe("2026-08-16")
  expect(first[0].logs.every((log) => log.calories !== null)).toBe(true)
  expect(first[0].logs.every((log) => log.weight !== null)).toBe(true)
  expect(first[0].hasOlderLogs).toBe(false)

  expect(first[1]).toHaveLength(15)
  expect(new Set(first[1].map((workout) => workout.exercise))).toEqual(
    new Set(["ベンチプレス", "ラットプルダウン", "バックスクワット"])
  )
  expect(new Set(first[1].map((workout) => workout.category))).toEqual(
    new Set(["上半身", "下半身"])
  )
  expect(
    first[1].filter((workout) => workout.date === "2026-08-16")
  ).toHaveLength(3)
})

afterEach(() => {
  vi.useRealTimers()
})

test.each([
  "2026-08-22T15:00:00Z",
  "2026-09-08T00:00:00Z",
  "2027-01-01T00:00:00Z",
])("実行日時が%sでも表示の基準日は固定される", async (now) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(now))

  await expect(fixtureFitnessDataSource.getDays()).resolves.toMatchObject({
    referenceDate: "2026-08-23",
  })
})
