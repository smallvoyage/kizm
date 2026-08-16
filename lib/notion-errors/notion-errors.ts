import "server-only"

import { isNotionClientError, type NotionClientError } from "@notionhq/client"

import { FitnessDataError } from "@/lib/fitness-data"

type NotionResource = "Days" | "Workouts"

const USER_MESSAGES = {
  Days: "NotionのDaysからデータを取得できませんでした。Integrationの接続、Days Data Source ID、トークンを確認してください。",
  Workouts:
    "NotionのWorkoutsからデータを取得できませんでした。Integrationの接続、Workouts Data Source ID、トークンを確認してください。",
} satisfies Record<NotionResource, string>

function convertNotionClientError(
  error: NotionClientError,
  resource: NotionResource
): FitnessDataError {
  console.error(`Notion ${resource} API request failed`, { code: error.code })

  return new FitnessDataError(USER_MESSAGES[resource], { cause: error })
}

function convertUnexpectedError(
  error: unknown,
  resource: NotionResource
): FitnessDataError {
  console.error(`Unexpected error while loading Notion ${resource}`)

  return new FitnessDataError(USER_MESSAGES[resource], { cause: error })
}

export function toFitnessDataError(
  error: unknown,
  resource: NotionResource
): FitnessDataError {
  if (error instanceof FitnessDataError) return error

  return isNotionClientError(error)
    ? convertNotionClientError(error, resource)
    : convertUnexpectedError(error, resource)
}
