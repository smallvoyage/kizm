import { describe, expect, test } from "vitest"

import type { FitnessLog, WorkoutSet } from "../fitness"
import {
  getDailyExportLog,
  getExportDates,
  getTrainingExportGroups,
} from "./image-export"

function log(date: string, weight: number | null): FitnessLog {
  return {
    date,
    weight,
    steps: null,
    calories: null,
    protein: null,
    fat: null,
    carbs: null,
    bodyFat: null,
    muscleMass: null,
  }
}

function set(
  date: string,
  weightKg: number,
  exercise = "スクワット"
): WorkoutSet {
  return { date, weightKg, exercise, category: "脚", reps: 5, setCount: 2 }
}

describe("画像の記録日と対象データ", () => {
  test("空、1日、順不同・重複の候補を新しい順に返し、入力を変更しない", () => {
    expect(getExportDates([])).toEqual([])
    expect(getExportDates([log("2026-08-01", 60)])).toEqual(["2026-08-01"])
    const logs = [
      log("2026-07-31", 60),
      log("2026-08-02", 61),
      log("2026-07-31", 62),
    ]
    expect(getExportDates(logs)).toEqual(["2026-08-02", "2026-07-31"])
    expect(logs[0].weight).toBe(60)
  })

  test("同日は末尾の記録を採用し、欠損値を補完しない", () => {
    const selected = log("2026-08-01", null)
    const logs = [log("2026-08-01", 60), log("2026-08-02", 61), selected]
    expect(getDailyExportLog(logs, "2026-08-01")).toBe(selected)
    expect(getDailyExportLog(logs, "2026-08-03")).toBeNull()
    expect(getDailyExportLog([], "2026-08-01")).toBeNull()
  })

  test("選択日の全種目をグループ化・展開し、後日の高記録に影響されない", () => {
    const history = [
      set("2026-08-03", 200),
      set("2026-08-01", 60),
      set("2026-08-02", 65),
      set("2026-08-02", 40, "ベンチプレス"),
      set("2026-08-02", 70),
    ]
    const groups = getTrainingExportGroups(history, "2026-08-02")
    expect(groups.map((group) => group.exercise)).toEqual([
      "スクワット",
      "ベンチプレス",
    ])
    expect(
      groups[0].sets.map((record) => [
        record.weightKg,
        record.isEstimatedOneRepMaxRecord,
      ])
    ).toEqual([
      [65, false],
      [65, false],
      [70, true],
      [70, false],
    ])
    expect(groups[1].sets).toHaveLength(2)
    expect(
      groups[1].sets.every((record) => !record.isEstimatedOneRepMaxRecord)
    ).toBe(true)
    expect(
      groups
        .flatMap((group) => group.sets)
        .every((record) => record.date === "2026-08-02")
    ).toBe(true)
    expect(history).toHaveLength(5)
    expect(getTrainingExportGroups(history, "2026-08-04")).toEqual([])
    expect(getTrainingExportGroups([], "2026-08-02")).toEqual([])
  })
})
