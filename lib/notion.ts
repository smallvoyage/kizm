import "server-only"

import { Client, isNotionClientError } from "@notionhq/client"
import { unstable_cache } from "next/cache"

import { FITNESS_LOGS_CACHE_TAG } from "@/lib/cache-tags"
import type { FitnessLog, WorkoutSet } from "@/lib/fitness"
import {
  type DaysResult,
  FitnessDataError,
  type FitnessDataSource,
} from "@/lib/fitness-data"
import {
  mapNotionPageToFitnessLog,
  mapNotionPageToWorkoutSet,
  NOTION_DAY_PROPERTY_NAMES,
} from "@/lib/notion-mapper"
import { queryAllFullPages } from "@/lib/notion-pagination/notion-pagination"
import {
  validateDaysDataSourceSchema,
  validateWorkoutsDataSourceSchema,
} from "@/lib/notion-schema"

const FITNESS_HISTORY_DAYS = 84
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const schemaValidationPromises = new Map<string, Promise<void>>()

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new FitnessDataError(
      `${name} が設定されていません。.env.local またはVercelの環境変数を確認してください。`
    )
  }
  return value
}

async function ensureValidDataSourceSchema(
  notion: Client,
  dataSourceId: string,
  validate: (properties: Record<string, { type: string }>) => void
) {
  const existingValidation = schemaValidationPromises.get(dataSourceId)
  if (existingValidation) {
    return existingValidation
  }

  const validation = notion.dataSources
    .retrieve({ data_source_id: dataSourceId })
    .then((dataSource) => validate(dataSource.properties))
  schemaValidationPromises.set(dataSourceId, validation)

  try {
    await validation
  } catch (error: unknown) {
    if (schemaValidationPromises.get(dataSourceId) === validation) {
      schemaValidationPromises.delete(dataSourceId)
    }
    throw error
  }
}

function getHistoryStartDate() {
  const referenceDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date())
  const referenceTime = new Date(`${referenceDate}T00:00:00Z`).getTime()
  const cutoffTime =
    referenceTime - (FITNESS_HISTORY_DAYS - 1) * DAY_IN_MILLISECONDS
  const cutoffDay = new Date(cutoffTime).getUTCDay()
  const daysSinceMonday = (cutoffDay + 6) % 7

  return new Date(cutoffTime - daysSinceMonday * DAY_IN_MILLISECONDS)
    .toISOString()
    .slice(0, 10)
}

async function fetchFitnessLogs(): Promise<DaysResult> {
  const token = getRequiredEnvironmentVariable("NOTION_TOKEN")
  const daysDataSourceId = getRequiredEnvironmentVariable(
    "NOTION_DAYS_DATA_SOURCE_ID"
  )
  const notion = new Client({ auth: token, notionVersion: "2026-03-11" })
  const historyStartDate = getHistoryStartDate()

  try {
    await ensureValidDataSourceSchema(
      notion,
      daysDataSourceId,
      validateDaysDataSourceSchema
    )

    const pages = await queryAllFullPages(notion.dataSources.query, {
      data_source_id: daysDataSourceId,
      page_size: 100,
      filter: {
        property: NOTION_DAY_PROPERTY_NAMES.date,
        date: { on_or_after: historyStartDate },
      },
      sorts: [
        {
          property: NOTION_DAY_PROPERTY_NAMES.date,
          direction: "ascending",
        },
      ],
    })

    if (pages.length === 0) {
      const olderResponse = await notion.dataSources.query({
        data_source_id: daysDataSourceId,
        page_size: 1,
        filter: {
          property: NOTION_DAY_PROPERTY_NAMES.date,
          date: { before: historyStartDate },
        },
      })

      return {
        logs: [],
        hasOlderLogs: olderResponse.results.length > 0,
      }
    }

    return {
      logs: pages
        .map(mapNotionPageToFitnessLog)
        .filter((log): log is FitnessLog => log !== null),
      hasOlderLogs: false,
    }
  } catch (error: unknown) {
    if (error instanceof FitnessDataError) throw error

    if (isNotionClientError(error)) {
      console.error("Notion API request failed", {
        code: error.code,
        message: error.message,
      })
    } else {
      console.error("Unexpected error while loading fitness logs", error)
    }

    throw new FitnessDataError(
      "NotionのDaysからデータを取得できませんでした。Integrationの接続、Days Data Source ID、トークンを確認してください。",
      { cause: error }
    )
  }
}

async function getWorkoutSets(): Promise<WorkoutSet[]> {
  const token = getRequiredEnvironmentVariable("NOTION_TOKEN")
  const workoutsDataSourceId = getRequiredEnvironmentVariable(
    "NOTION_WORKOUTS_DATA_SOURCE_ID"
  )
  const notion = new Client({ auth: token, notionVersion: "2026-03-11" })

  try {
    await ensureValidDataSourceSchema(
      notion,
      workoutsDataSourceId,
      validateWorkoutsDataSourceSchema
    )

    const pages = await queryAllFullPages(notion.dataSources.query, {
      data_source_id: workoutsDataSourceId,
      page_size: 100,
    })

    return pages
      .map(mapNotionPageToWorkoutSet)
      .filter((set): set is WorkoutSet => set !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (error: unknown) {
    if (error instanceof FitnessDataError) throw error

    if (isNotionClientError(error)) {
      console.error("Notion Workouts API request failed", {
        code: error.code,
        message: error.message,
      })
    } else {
      console.error("Unexpected error while loading workout sets", error)
    }

    throw new FitnessDataError(
      "NotionのWorkoutsからデータを取得できませんでした。Integrationの接続、Workouts Data Source ID、トークンを確認してください。",
      { cause: error }
    )
  }
}

const getFitnessLogs = unstable_cache(
  fetchFitnessLogs,
  [FITNESS_LOGS_CACHE_TAG],
  {
    revalidate: 300,
    tags: [FITNESS_LOGS_CACHE_TAG],
  }
)

export const notionFitnessDataSource = {
  getDays: getFitnessLogs,
  getWorkouts: getWorkoutSets,
} satisfies FitnessDataSource
