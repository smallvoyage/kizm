import { expect, test } from "vitest"

import { fixtureFitnessDataSource } from "@/lib/fixture"

test("Notion用環境変数なしでfixtureデータを取得できる", async () => {
  await expect(fixtureFitnessDataSource.getDays()).resolves.toEqual({
    logs: [],
    hasOlderLogs: false,
  })
  await expect(fixtureFitnessDataSource.getWorkouts()).resolves.toEqual([])
})
