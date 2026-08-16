import type { PageObjectResponse } from "@notionhq/client"

import type { FitnessLog, WorkoutSet } from "@/lib/fitness"

export const NOTION_DAY_PROPERTY_NAMES = {
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

export const NOTION_WORKOUT_PROPERTY_NAMES = {
  date: "Exercised Day",
  category: "Category",
  exercise: "Exercise",
  weight: "Weight kg",
  reps: "Reps",
  setCount: "Set Count",
} as const

type PageProperty = PageObjectResponse["properties"][string]

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

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const date = new Date(`${value}T00:00:00Z`)
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  )
}

export function mapNotionPageToFitnessLog(
  page: PageObjectResponse
): FitnessLog | null {
  const { properties } = page
  const date =
    getDate(properties, NOTION_DAY_PROPERTY_NAMES.date)?.slice(0, 10) ?? null
  if (!date) return null

  return {
    date,
    steps: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.steps),
    calories: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.calories),
    protein: getNumber(
      properties,
      NOTION_DAY_PROPERTY_NAMES.protein,
      NOTION_DAY_PROPERTY_NAMES.legacyProtein
    ),
    fat: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.fat),
    carbs: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.carbs),
    weight: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.weight),
    bodyFat: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.bodyFat),
    muscleMass: getNumber(properties, NOTION_DAY_PROPERTY_NAMES.muscleMass),
  }
}

export function mapNotionPageToWorkoutSet(
  page: PageObjectResponse
): WorkoutSet | null {
  const { properties } = page
  const date = getPlainText(
    properties[NOTION_WORKOUT_PROPERTY_NAMES.date]
  )?.slice(0, 10)
  const categoryProperty = properties[NOTION_WORKOUT_PROPERTY_NAMES.category]
  const category =
    categoryProperty?.type === "select"
      ? (categoryProperty.select?.name.trim() ?? "未分類")
      : "未分類"
  const exerciseProperty = properties[NOTION_WORKOUT_PROPERTY_NAMES.exercise]
  const exercise =
    exerciseProperty?.type === "select"
      ? (exerciseProperty.select?.name.trim() ?? null)
      : null
  const weightText = getPlainText(
    properties[NOTION_WORKOUT_PROPERTY_NAMES.weight]
  )
  const weightKg = weightText === null ? Number.NaN : Number(weightText)
  const reps = getNumber(properties, NOTION_WORKOUT_PROPERTY_NAMES.reps)
  const setCount = getNumber(properties, NOTION_WORKOUT_PROPERTY_NAMES.setCount)

  if (
    !date ||
    !isCalendarDate(date) ||
    !exercise ||
    !Number.isFinite(weightKg) ||
    weightKg < 0 ||
    reps === null ||
    !Number.isFinite(reps) ||
    reps <= 0 ||
    setCount === null ||
    !Number.isSafeInteger(setCount) ||
    setCount <= 0
  ) {
    return null
  }

  return { date, category, exercise, weightKg, reps, setCount }
}
