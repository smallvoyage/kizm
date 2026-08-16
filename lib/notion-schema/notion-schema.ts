import { FitnessDataError } from "@/lib/fitness-data"

type DataSourceProperties = Record<string, { type: string }>

const REQUIRED_DAYS_PROPERTY_TYPES = {
  "Log Date": "date",
  "Weight kg": "number",
  "Body Fat %": "number",
  "Muscle Mass kg": "number",
} as const

const REQUIRED_WORKOUTS_PROPERTY_TYPES = {
  "Exercised Day": "title",
  Category: "select",
  Exercise: "select",
  "Weight kg": "rich_text",
  Reps: "number",
  "Set Count": "number",
} as const

function getMissingProperties(
  properties: DataSourceProperties,
  requiredPropertyTypes: Record<string, string>
) {
  return Object.keys(requiredPropertyTypes).filter(
    (name) => !(name in properties)
  )
}

function getInvalidProperties(
  properties: DataSourceProperties,
  requiredPropertyTypes: Record<string, string>
) {
  return Object.entries(requiredPropertyTypes)
    .filter(([name, expectedType]) => properties[name]?.type !== expectedType)
    .map(([name, expectedType]) => `${name} (${expectedType})`)
}

export function validateDaysDataSourceSchema(
  properties: DataSourceProperties
): void {
  const missing = getMissingProperties(properties, REQUIRED_DAYS_PROPERTY_TYPES)
  if (missing.length > 0) {
    throw new FitnessDataError(
      `Notionに必要なプロパティがありません: ${missing.join(", ")}`
    )
  }

  const invalid = getInvalidProperties(properties, REQUIRED_DAYS_PROPERTY_TYPES)
  if (invalid.length > 0) {
    throw new FitnessDataError(
      `Notionプロパティの型を確認してください: ${invalid.join(", ")}`
    )
  }
}

export function validateWorkoutsDataSourceSchema(
  properties: DataSourceProperties
): void {
  const missing = getMissingProperties(
    properties,
    REQUIRED_WORKOUTS_PROPERTY_TYPES
  )
  if (missing.length > 0) {
    throw new FitnessDataError(
      `NotionのWorkoutsに必要なプロパティがありません: ${missing.join(", ")}`
    )
  }

  const invalid = getInvalidProperties(
    properties,
    REQUIRED_WORKOUTS_PROPERTY_TYPES
  )
  if (invalid.length > 0) {
    throw new FitnessDataError(
      `NotionのWorkoutsプロパティの型を確認してください: ${invalid.join(", ")}`
    )
  }
}
