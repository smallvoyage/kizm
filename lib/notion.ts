import "server-only"

import {
  Client,
  isFullPage,
  isNotionClientError,
  type PageObjectResponse,
} from "@notionhq/client"
import { unstable_cache } from "next/cache"

import { FITNESS_LOGS_CACHE_TAG } from "@/lib/cache-tags"
import type { FitnessLog } from "@/lib/fitness"

const FITNESS_HISTORY_DAYS = 84
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const PROPERTY_NAMES = {
  date: "Log Date",
  steps: "Steps",
  calories: "Total Calories",
  protein: "Total Protein g",
  legacyProtein: "Total Protein",
  fat: "Total Fat g",
  carbs: "Total Carbs g",
  weight: "Weight kg",
  bodyFat: "Body Fat %",
  muscleMass: "Muscle Mass kg",
} as const

const REQUIRED_PROPERTY_TYPES = {
  [PROPERTY_NAMES.date]: "date",
  [PROPERTY_NAMES.weight]: "number",
  [PROPERTY_NAMES.bodyFat]: "number",
  [PROPERTY_NAMES.muscleMass]: "number",
} as const

type PageProperty = PageObjectResponse["properties"][string]

const schemaValidationPromises = new Map<string, Promise<void>>()

export class FitnessDataError extends Error {
  constructor(
    public readonly userMessage: string,
    options?: ErrorOptions
  ) {
    super(userMessage, options)
    this.name = "FitnessDataError"
  }
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new FitnessDataError(
      `${name} が設定されていません。.env.local またはVercelの環境変数を確認してください。`
    )
  }
  return value
}

function getNumber(
  properties: PageObjectResponse["properties"],
  ...names: string[]
) {
  for (const name of names) {
    const property: PageProperty | undefined = properties[name]

    if (property?.type === "number") {
      return property.number
    }

    if (property?.type === "rollup" && property.rollup.type === "number") {
      return property.rollup.number
    }
  }

  return null
}

function getDate(properties: PageObjectResponse["properties"], name: string) {
  const property: PageProperty | undefined = properties[name]
  return property?.type === "date" ? (property.date?.start ?? null) : null
}

function validateProperties(properties: Record<string, { type: string }>) {
  const missing = Object.keys(REQUIRED_PROPERTY_TYPES).filter(
    (name) => !(name in properties)
  )
  if (missing.length > 0) {
    throw new FitnessDataError(
      `Notionに必要なプロパティがありません: ${missing.join(", ")}`
    )
  }

  const invalid = Object.entries(REQUIRED_PROPERTY_TYPES)
    .filter(([name, expectedType]) => properties[name]?.type !== expectedType)
    .map(([name, expectedType]) => `${name} (${expectedType})`)
  if (invalid.length > 0) {
    throw new FitnessDataError(
      `Notionプロパティの型を確認してください: ${invalid.join(", ")}`
    )
  }
}

async function ensureValidDataSourceSchema(
  notion: Client,
  dataSourceId: string
) {
  const existingValidation = schemaValidationPromises.get(dataSourceId)
  if (existingValidation) {
    return existingValidation
  }

  const validation = notion.dataSources
    .retrieve({ data_source_id: dataSourceId })
    .then((dataSource) => validateProperties(dataSource.properties))
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

function toFitnessLog(page: PageObjectResponse): FitnessLog | null {
  const { properties } = page
  const date = getDate(properties, PROPERTY_NAMES.date)?.slice(0, 10) ?? null
  if (!date) return null

  return {
    date,
    steps: getNumber(properties, PROPERTY_NAMES.steps),
    calories: getNumber(properties, PROPERTY_NAMES.calories),
    protein: getNumber(
      properties,
      PROPERTY_NAMES.protein,
      PROPERTY_NAMES.legacyProtein
    ),
    fat: getNumber(properties, PROPERTY_NAMES.fat),
    carbs: getNumber(properties, PROPERTY_NAMES.carbs),
    weight: getNumber(properties, PROPERTY_NAMES.weight),
    bodyFat: getNumber(properties, PROPERTY_NAMES.bodyFat),
    muscleMass: getNumber(properties, PROPERTY_NAMES.muscleMass),
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

  return new Date(
    referenceTime - (FITNESS_HISTORY_DAYS - 1) * DAY_IN_MILLISECONDS
  )
    .toISOString()
    .slice(0, 10)
}

async function fetchFitnessLogs(): Promise<FitnessLog[]> {
  const token = getRequiredEnvironmentVariable("NOTION_TOKEN")
  const daysDataSourceId = getRequiredEnvironmentVariable(
    "NOTION_DAYS_DATA_SOURCE_ID"
  )
  const notion = new Client({ auth: token, notionVersion: "2026-03-11" })
  const historyStartDate = getHistoryStartDate()

  try {
    await ensureValidDataSourceSchema(notion, daysDataSourceId)

    const pages: PageObjectResponse[] = []
    let startCursor: string | undefined

    do {
      const response = await notion.dataSources.query({
        data_source_id: daysDataSourceId,
        page_size: 100,
        start_cursor: startCursor,
        filter: {
          property: PROPERTY_NAMES.date,
          date: { on_or_after: historyStartDate },
        },
        sorts: [
          {
            property: PROPERTY_NAMES.date,
            direction: "ascending",
          },
        ],
      })
      pages.push(...response.results.filter(isFullPage))
      startCursor = response.has_more
        ? (response.next_cursor ?? undefined)
        : undefined
    } while (startCursor)

    if (pages.length === 0) return []
    return pages
      .map(toFitnessLog)
      .filter((log): log is FitnessLog => log !== null)
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

export const getFitnessLogs = unstable_cache(
  fetchFitnessLogs,
  [FITNESS_LOGS_CACHE_TAG],
  {
    revalidate: 300,
    tags: [FITNESS_LOGS_CACHE_TAG],
  }
)
