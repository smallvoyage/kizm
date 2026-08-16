import "server-only"

import {
  Client,
  isFullPage,
  isNotionClientError,
  type PageObjectResponse,
} from "@notionhq/client"
import { unstable_cache } from "next/cache"

import { FITNESS_LOGS_CACHE_TAG } from "@/lib/cache-tags"
import type { FitnessLog, WorkoutSet } from "@/lib/fitness"

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

const WORKOUT_PROPERTY_NAMES = {
  date: "Exercised Day",
  exercise: "Exercise",
  weight: "Weight kg",
  reps: "Reps",
} as const

const REQUIRED_WORKOUT_PROPERTY_TYPES = {
  [WORKOUT_PROPERTY_NAMES.date]: "title",
  [WORKOUT_PROPERTY_NAMES.exercise]: "select",
  [WORKOUT_PROPERTY_NAMES.weight]: "rich_text",
  [WORKOUT_PROPERTY_NAMES.reps]: "number",
} as const

type PageProperty = PageObjectResponse["properties"][string]

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

function getPlainText(property: PageProperty | undefined): string | null {
  if (property?.type === "title") {
    return (
      property.title
        .map((item) => item.plain_text)
        .join("")
        .trim() || null
    )
  }
  if (property?.type === "rich_text") {
    return (
      property.rich_text
        .map((item) => item.plain_text)
        .join("")
        .trim() || null
    )
  }
  return null
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

function validateWorkoutProperties(
  properties: Record<string, { type: string }>
) {
  const missing = Object.keys(REQUIRED_WORKOUT_PROPERTY_TYPES).filter(
    (name) => !(name in properties)
  )
  if (missing.length > 0) {
    throw new FitnessDataError(
      `NotionのWorkoutsに必要なプロパティがありません: ${missing.join(", ")}`
    )
  }

  const invalid = Object.entries(REQUIRED_WORKOUT_PROPERTY_TYPES)
    .filter(([name, expectedType]) => properties[name]?.type !== expectedType)
    .map(([name, expectedType]) => `${name} (${expectedType})`)
  if (invalid.length > 0) {
    throw new FitnessDataError(
      `NotionのWorkoutsプロパティの型を確認してください: ${invalid.join(", ")}`
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

function toWorkoutSet(page: PageObjectResponse): WorkoutSet | null {
  const { properties } = page
  const date = getPlainText(properties[WORKOUT_PROPERTY_NAMES.date])?.slice(
    0,
    10
  )
  const exerciseProperty = properties[WORKOUT_PROPERTY_NAMES.exercise]
  const exercise =
    exerciseProperty?.type === "select"
      ? (exerciseProperty.select?.name.trim() ?? null)
      : null
  const weightText = getPlainText(properties[WORKOUT_PROPERTY_NAMES.weight])
  const weightKg = weightText === null ? Number.NaN : Number(weightText)
  const reps = getNumber(properties, WORKOUT_PROPERTY_NAMES.reps)

  if (
    !date ||
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !exercise ||
    !Number.isFinite(weightKg) ||
    weightKg < 0 ||
    reps === null ||
    !Number.isFinite(reps) ||
    reps <= 0
  ) {
    return null
  }

  return { date, exercise, weightKg, reps }
}

async function fetchFitnessLogs(): Promise<FitnessLog[]> {
  const token = getRequiredEnvironmentVariable("NOTION_TOKEN")
  const daysDataSourceId = getRequiredEnvironmentVariable(
    "NOTION_DAYS_DATA_SOURCE_ID"
  )
  const notion = new Client({ auth: token, notionVersion: "2026-03-11" })

  try {
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: daysDataSourceId,
    })
    validateProperties(dataSource.properties)

    const pages: PageObjectResponse[] = []
    let startCursor: string | undefined

    do {
      const response = await notion.dataSources.query({
        data_source_id: daysDataSourceId,
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
      "NotionのDaysからデータを取得できませんでした。Integrationの接続、Days Data Source ID、トークンを確認してください。",
      { cause: error }
    )
  }
}

export async function getWorkoutSets(): Promise<WorkoutSet[]> {
  const token = getRequiredEnvironmentVariable("NOTION_TOKEN")
  const workoutsDataSourceId = getRequiredEnvironmentVariable(
    "NOTION_WORKOUTS_DATA_SOURCE_ID"
  )
  const notion = new Client({ auth: token, notionVersion: "2026-03-11" })

  try {
    const dataSource = await notion.dataSources.retrieve({
      data_source_id: workoutsDataSourceId,
    })
    validateWorkoutProperties(dataSource.properties)

    const pages: PageObjectResponse[] = []
    let startCursor: string | undefined

    do {
      const response = await notion.dataSources.query({
        data_source_id: workoutsDataSourceId,
        page_size: 100,
        start_cursor: startCursor,
      })
      pages.push(...response.results.filter(isFullPage))
      startCursor = response.has_more
        ? (response.next_cursor ?? undefined)
        : undefined
    } while (startCursor)

    return pages
      .map(toWorkoutSet)
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

export const getFitnessLogs = unstable_cache(
  fetchFitnessLogs,
  [FITNESS_LOGS_CACHE_TAG],
  {
    revalidate: 300,
    tags: [FITNESS_LOGS_CACHE_TAG],
  }
)
