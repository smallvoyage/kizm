import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createNotionClient: vi.fn(),
  cacheLife: vi.fn(),
  cacheTag: vi.fn(),
  mapNotionPageToFitnessLog: vi.fn(),
  mapNotionPageToWorkoutSet: vi.fn(),
  queryAllFullPages: vi.fn(),
  validateDaysDataSourceSchema: vi.fn(),
  validateWorkoutsDataSourceSchema: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("next/cache", () => ({
  cacheLife: mocks.cacheLife,
  cacheTag: mocks.cacheTag,
}))
vi.mock("@/lib/notion-client", () => ({
  createNotionClient: mocks.createNotionClient,
}))
vi.mock("@/lib/notion-mapper", () => ({
  mapNotionPageToFitnessLog: mocks.mapNotionPageToFitnessLog,
  mapNotionPageToWorkoutSet: mocks.mapNotionPageToWorkoutSet,
  NOTION_DAY_PROPERTY_NAMES: { date: "Date" },
}))
vi.mock("@/lib/notion-pagination/notion-pagination", () => ({
  queryAllFullPages: mocks.queryAllFullPages,
}))
vi.mock("@/lib/notion-schema", () => ({
  validateDaysDataSourceSchema: mocks.validateDaysDataSourceSchema,
  validateWorkoutsDataSourceSchema: mocks.validateWorkoutsDataSourceSchema,
}))

import { FITNESS_LOGS_CACHE_TAG } from "@/lib/cache-tags"
import { notionFitnessDataSource } from "./notion"

const retrieve = vi.fn()
const query = vi.fn()

describe("notionFitnessDataSource", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.clearAllMocks()
  })

  it("分離したNotionモジュールを通してDaysをドメインモデルへ変換する", async () => {
    vi.stubEnv("NOTION_DAYS_DATA_SOURCE_ID", "days-source")
    const properties = { Date: { type: "date" } }
    const page = { id: "day-page" }
    const log = {
      date: "2026-08-22",
      steps: 10_000,
      calories: 2_200,
      protein: 150,
      fat: 60,
      carbs: 250,
      weight: 68,
      bodyFat: 18,
      muscleMass: 30,
    }
    retrieve.mockResolvedValue({ properties })
    mocks.createNotionClient.mockReturnValue({
      dataSources: { query, retrieve },
    })
    mocks.queryAllFullPages.mockResolvedValue([page])
    mocks.mapNotionPageToFitnessLog.mockReturnValue(log)

    await expect(notionFitnessDataSource.getDays()).resolves.toEqual({
      logs: [log],
      hasOlderLogs: false,
    })

    expect(retrieve).toHaveBeenCalledWith({ data_source_id: "days-source" })
    expect(mocks.validateDaysDataSourceSchema).toHaveBeenCalledWith(properties)
    expect(mocks.cacheLife).toHaveBeenCalledWith({ revalidate: 300 })
    expect(mocks.cacheTag).toHaveBeenCalledWith(FITNESS_LOGS_CACHE_TAG)
    expect(mocks.queryAllFullPages).toHaveBeenCalledWith(
      query,
      expect.objectContaining({
        data_source_id: "days-source",
        filter: {
          property: "Date",
          date: { on_or_after: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
        },
        page_size: 100,
        sorts: [{ property: "Date", direction: "ascending" }],
      })
    )
    expect(mocks.mapNotionPageToFitnessLog.mock.calls[0]?.[0]).toBe(page)
  })

  it("分離したNotionモジュールを通してWorkoutsをドメインモデルへ変換する", async () => {
    vi.stubEnv("NOTION_WORKOUTS_DATA_SOURCE_ID", "workouts-source")
    const properties = { Date: { type: "date" } }
    const pages = [{ id: "newer" }, { id: "older" }]
    const newerWorkout = {
      date: "2026-08-22",
      category: "上半身",
      exercise: "ベンチプレス",
      weightKg: 70,
      reps: 8,
      setCount: 3,
    }
    const olderWorkout = { ...newerWorkout, date: "2026-08-15" }
    retrieve.mockResolvedValue({ properties })
    mocks.createNotionClient.mockReturnValue({
      dataSources: { query, retrieve },
    })
    mocks.queryAllFullPages.mockResolvedValue(pages)
    mocks.mapNotionPageToWorkoutSet
      .mockReturnValueOnce(newerWorkout)
      .mockReturnValueOnce(olderWorkout)

    await expect(notionFitnessDataSource.getWorkouts()).resolves.toEqual([
      olderWorkout,
      newerWorkout,
    ])

    expect(retrieve).toHaveBeenCalledWith({
      data_source_id: "workouts-source",
    })
    expect(mocks.validateWorkoutsDataSourceSchema).toHaveBeenCalledWith(
      properties
    )
    expect(mocks.queryAllFullPages).toHaveBeenCalledWith(query, {
      data_source_id: "workouts-source",
      page_size: 100,
    })
    expect(mocks.mapNotionPageToWorkoutSet).toHaveBeenCalledTimes(2)
  })
})
