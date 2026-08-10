import "server-only"

import {
  Client,
  isFullPage,
  isNotionClientError,
  type PageObjectResponse,
} from "@notionhq/client"

import type { FitnessLog } from "@/lib/fitness"

const PROPERTY_NAMES = {
  date: "Log Date",
  steps: "Steps",
  calories: "Total Calories",
  protein: "Total Protein",
  fat: "Total Fat g",
  carbs: "Total Carbs g",
  weight: "Weight kg",
  bodyFat: "Body Fat %",
  muscleMass: "Muscle Mass kg",
} as const

const EXPECTED_PROPERTY_TYPES = {
  [PROPERTY_NAMES.date]: "date",
  [PROPERTY_NAMES.steps]: "number",
  [PROPERTY_NAMES.calories]: "number",
  [PROPERTY_NAMES.protein]: "number",
  [PROPERTY_NAMES.fat]: "number",
  [PROPERTY_NAMES.carbs]: "number",
  [PROPERTY_NAMES.weight]: "number",
  [PROPERTY_NAMES.bodyFat]: "number",
  [PROPERTY_NAMES.muscleMass]: "number",
} as const

type PageProperty = PageObjectResponse["properties"][string]

export class FitnessDataError extends Error {
  constructor(public readonly userMessage: string, options?: ErrorOptions) {
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

function getNumber(properties: PageObjectResponse["properties"], name: string) {
  const property: PageProperty | undefined = properties[name]
  return property?.type === "number" ? property.number : null
}

function getDate(properties: PageObjectResponse["properties"], name: string) {
  const property: PageProperty | undefined = properties[name]
  return property?.type === "date" ? (property.date?.start ?? null) : null
}

function validateProperties(properties: Record<string, { type: string }>) {
  const missing = Object.keys(EXPECTED_PROPERTY_TYPES).filter(
    (name) => !(name in properties)
  )
  if (missing.length > 0) {
    throw new FitnessDataError(
      `Notionに必要なプロパティがありません: ${missing.join(", ")}`
    )
  }

  const invalid = Object.entries(EXPECTED_PROPERTY_TYPES)
    .filter(([name, expectedType]) => properties[name]?.type !== expectedType)
    .map(([name, expectedType]) => `${name} (${expectedType})`)
  if (invalid.length > 0) {
    throw new FitnessDataError(
      `Notionプロパティの型を確認してください: ${invalid.join(", ")}`
    )
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
    protein: getNumber(properties, PROPERTY_NAMES.protein),
    fat: getNumber(properties, PROPERTY_NAMES.fat),
    carbs: getNumber(properties, PROPERTY_NAMES.carbs),
    weight: getNumber(properties, PROPERTY_NAMES.weight),
    bodyFat: getNumber(properties, PROPERTY_NAMES.bodyFat),
    muscleMass: getNumber(properties, PROPERTY_NAMES.muscleMass),
  }
}

export async function getFitnessLogs(): Promise<FitnessLog[]> {
  const token = getRequiredEnvironmentVariable("NOTION_TOKEN")
  const dataSourceId = getRequiredEnvironmentVariable("NOTION_DATA_SOURCE_ID")
  const notion = new Client({ auth: token, notionVersion: "2026-03-11" })

  try {
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: dataSourceId,
    })
    validateProperties(dataSource.properties)

    const pages: PageObjectResponse[] = []
    let startCursor: string | undefined

    do {
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        start_cursor: startCursor,
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
      .sort((a, b) => a.date.localeCompare(b.date))
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
      "Notionからデータを取得できませんでした。Integrationの接続、Data Source ID、トークンを確認してください。",
      { cause: error }
    )
  }
}
