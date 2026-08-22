import { describe, expect, test } from "vitest"
import {
  type FitnessLog,
  filterLogsByPeriod,
  getExerciseGroups,
  getNutritionAchievement,
  getRepresentativeWorkoutSets,
  type NutritionAchievement,
  type NutritionMetric,
  type WorkoutSet,
} from "./fitness"

function createDatedLog(date: string): FitnessLog {
  return createNutritionLog({ date })
}

describe("filterLogsByPeriod", () => {
  const logs = [
    createDatedLog("2026-05-01"),
    createDatedLog("2026-05-24"),
    createDatedLog("2026-06-16"),
    createDatedLog("2026-07-30"),
    createDatedLog("2026-08-15"),
    createDatedLog("2026-08-16"),
    createDatedLog("2026-08-17"),
    createDatedLog("invalid"),
  ]

  test.each([
    ["7D", ["2026-08-15", "2026-08-16", "2026-08-17"]],
    ["30D", ["2026-07-30", "2026-08-15", "2026-08-16", "2026-08-17"]],
    [
      "90D",
      [
        "2026-05-24",
        "2026-06-16",
        "2026-07-30",
        "2026-08-15",
        "2026-08-16",
        "2026-08-17",
      ],
    ],
  ] as const)("%sは基準日を含む期間内の記録を返す", (period, dates) => {
    expect(filterLogsByPeriod(logs, period, "2026-08-17")).toEqual(
      dates.map((date) => createDatedLog(date))
    )
  })

  test("ALLは日付の妥当性にかかわらず全記録を返す", () => {
    expect(filterLogsByPeriod(logs, "ALL", "invalid")).toBe(logs)
  })

  test("基準日が不正な場合は空配列を返す", () => {
    expect(filterLogsByPeriod(logs, "30D", "2026-02-31")).toEqual([])
  })
})

const goals: Record<NutritionMetric, number> = {
  calories: 100,
  protein: 100,
  fat: 100,
  carbs: 100,
}

function createNutritionLog(overrides: Partial<FitnessLog> = {}): FitnessLog {
  return {
    date: "2026-08-17",
    steps: null,
    calories: 100,
    protein: 100,
    fat: 100,
    carbs: 100,
    weight: null,
    bodyFat: null,
    muscleMass: null,
    ...overrides,
  }
}

const calorieBoundaryCases: Array<[number, NutritionAchievement]> = [
  [59, "missed"],
  [60, "partial"],
  [61, "partial"],
  [79, "partial"],
  [80, "near"],
  [81, "near"],
  [89, "near"],
  [90, "achieved"],
  [91, "achieved"],
  [99, "achieved"],
  [100, "achieved"],
  [101, "achieved"],
  [109, "achieved"],
  [110, "achieved"],
  [111, "near"],
  [119, "near"],
  [120, "near"],
  [121, "partial"],
  [139, "partial"],
  [140, "partial"],
  [141, "missed"],
]

const macroBoundaryCases: Array<[number, NutritionAchievement]> = [
  [59, "missed"],
  [60, "partial"],
  [61, "partial"],
  [79, "partial"],
  [80, "near"],
  [81, "near"],
  [99, "near"],
  [100, "achieved"],
  [101, "achieved"],
]

describe("getNutritionAchievement", () => {
  test.each(calorieBoundaryCases)(
    "calories が目標の %i%% の場合は %s",
    (percentage, expected) => {
      expect(
        getNutritionAchievement(
          createNutritionLog({ calories: percentage }),
          goals
        )
      ).toBe(expected)
    }
  )

  describe.each(["protein", "carbs"] as const)("%s の達成率", (metric) => {
    test.each(macroBoundaryCases)(
      "目標の %i%% の場合は %s",
      (percentage, expected) => {
        expect(
          getNutritionAchievement(
            createNutritionLog({ [metric]: percentage }),
            goals
          )
        ).toBe(expected)
      }
    )
  })

  test.each([
    [99, "achieved"],
    [100, "achieved"],
    [101, "near"],
    [120, "near"],
    [121, "partial"],
    [140, "partial"],
    [141, "missed"],
  ] as Array<[number, NutritionAchievement]>)(
    "脂質が目標の %i%% の場合は %s",
    (value, expected) => {
      expect(
        getNutritionAchievement(createNutritionLog({ fat: value }), goals)
      ).toBe(expected)
    }
  )

  test("log自体がない場合はnoneを返す", () => {
    expect(getNutritionAchievement(null, goals)).toBe("none")
  })

  test("栄養値がすべてnullの場合はnoneを返す", () => {
    expect(
      getNutritionAchievement(
        createNutritionLog({
          calories: null,
          protein: null,
          fat: null,
          carbs: null,
        }),
        goals
      )
    ).toBe("none")
  })

  test.each<NutritionMetric>(["calories", "protein", "fat", "carbs"])(
    "%sだけがnullの場合はmissedを返す",
    (missingMetric) => {
      expect(
        getNutritionAchievement(
          createNutritionLog({ [missingMetric]: null }),
          goals
        )
      ).toBe("missed")
    }
  )
})

function workoutSet(
  exercise: string,
  date: string,
  category = "筋力トレーニング"
): WorkoutSet {
  return {
    date,
    category,
    exercise,
    weightKg: 60,
    reps: 10,
    setCount: 3,
  }
}

describe("getExerciseGroups", () => {
  test("種目を最終実施日の降順に並べる", () => {
    const groups = getExerciseGroups([
      workoutSet("スクワット", "2026-08-10"),
      workoutSet("ベンチプレス", "2026-08-12"),
      workoutSet("デッドリフト", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual([
      "デッドリフト",
      "ベンチプレス",
      "スクワット",
    ])
  })

  test("最終実施日が同じ種目は日本語名の昇順に並べる", () => {
    const groups = getExerciseGroups([
      workoutSet("ベンチプレス", "2026-08-14"),
      workoutSet("スクワット", "2026-08-14"),
      workoutSet("アームカール", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual([
      "アームカール",
      "スクワット",
      "ベンチプレス",
    ])
  })

  test("同じ種目の複数セットを最新の記録1件にまとめる", () => {
    const groups = getExerciseGroups([
      workoutSet("スクワット", "2026-08-10"),
      workoutSet("ベンチプレス", "2026-08-12"),
      workoutSet("スクワット", "2026-08-14"),
    ])

    expect(groups[0]?.exercises).toEqual(["スクワット", "ベンチプレス"])
  })
})

describe("getRepresentativeWorkoutSets", () => {
  test("対象種目だけを日ごとに推定1RMが最大のセットへまとめ、同値なら重量の大きいセットを選ぶ", () => {
    const result = getRepresentativeWorkoutSets(
      [
        {
          ...workoutSet("ベンチプレス", "2026-08-14"),
          weightKg: 50,
          reps: 18,
        },
        {
          ...workoutSet("スクワット", "2026-08-14"),
          weightKg: 200,
          reps: 5,
        },
        {
          ...workoutSet("ベンチプレス", "2026-08-14"),
          weightKg: 60,
          reps: 10,
        },
        {
          ...workoutSet("ベンチプレス", "2026-08-10"),
          weightKg: 70,
          reps: 8,
        },
        {
          ...workoutSet("ベンチプレス", "2026-08-10"),
          weightKg: 60,
          reps: 12,
        },
      ],
      "ベンチプレス"
    )

    expect(result).toEqual([
      {
        ...workoutSet("ベンチプレス", "2026-08-10"),
        weightKg: 70,
        reps: 8,
        estimatedOneRepMax: 70 * (1 + 8 / 30),
      },
      {
        ...workoutSet("ベンチプレス", "2026-08-14"),
        weightKg: 60,
        reps: 10,
        estimatedOneRepMax: 60 * (1 + 10 / 30),
      },
    ])
  })
})
