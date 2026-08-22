import { expect, test } from "vitest"

import { emptyFixtureFitnessDataSource } from "./empty-fixture"

test("DaysとWorkoutsが空の状態を取得できる", async () => {
  const [days, workouts] = await Promise.all([
    emptyFixtureFitnessDataSource.getDays(),
    emptyFixtureFitnessDataSource.getWorkouts(),
  ])

  expect(days).toEqual({ logs: [], hasOlderLogs: false })
  expect(workouts).toEqual([])
})
