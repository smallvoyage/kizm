import { describe, expect, it } from "vitest"
import type { WorkoutSet } from "../fitness"
import { getTrainingRecord } from "./training-record"

const date = "2026-09-08"
const set = (overrides: Partial<WorkoutSet> = {}): WorkoutSet => ({
  date,
  category: "上半身",
  exercise: "ベンチプレス",
  weightKg: 60,
  reps: 8,
  setCount: 3,
  ...overrides,
})

describe("getTrainingRecord", () => {
  it("種目の初出順と種目内の入力順を保ち、全セットを展開する", () => {
    const history = [
      set(),
      set({ exercise: "スクワット", setCount: 4 }),
      set({ weightKg: 65, setCount: 1 }),
    ]
    const before = structuredClone(history)
    const record = getTrainingRecord(history, date)
    expect(record.setCount).toBe(8)
    expect(record.groups.map((group) => group.exercise)).toEqual([
      "ベンチプレス",
      "スクワット",
    ])
    expect(record.groups[0].sets.map((item) => item.weightKg)).toEqual([
      60, 60, 60, 65,
    ])
    expect(record.groups[1].sets).toHaveLength(4)
    expect(history).toEqual(before)
    expect(record.groups[0].sets[0]).not.toBe(record.groups[0].sets[1])
  })

  it("過去最高を更新した行の先頭セットだけにMAX RMを残す", () => {
    const record = getTrainingRecord(
      [
        set({ date: "2026-09-01", weightKg: 55 }),
        set(),
        set({ weightKg: 65, setCount: 2 }),
        set({ date: "2026-09-09", weightKg: 100 }),
      ],
      date
    )
    expect(
      record.groups[0].sets.map((item) => item.isEstimatedOneRepMaxRecord)
    ).toEqual([false, false, false, true, false])
    expect(record.setCount).toBe(5)
  })

  it.each([
    ["初回", []],
    ["過去最高と同値", [set({ date: "2026-09-01" })]],
    ["過去最高未満", [set({ date: "2026-09-01", weightKg: 70 })]],
  ])("%sはMAX RMにしない", (_, previous) => {
    expect(
      getTrainingRecord([...previous, set()], date).groups[0].sets.every(
        (item) => !item.isEstimatedOneRepMaxRecord
      )
    ).toBe(true)
  })

  it("対象日の記録がなければ空の結果を返す", () => {
    expect(getTrainingRecord([set({ date: "2026-09-01" })], date)).toEqual({
      date,
      groups: [],
      setCount: 0,
    })
  })
})
