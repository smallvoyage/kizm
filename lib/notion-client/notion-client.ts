import "server-only"

import { Client } from "@notionhq/client"

import { FitnessDataError } from "@/lib/fitness-data"

const NOTION_VERSION = "2026-03-11"

export function createNotionClient(): Client {
  const token = process.env.NOTION_TOKEN?.trim()
  if (!token) {
    throw new FitnessDataError(
      "NOTION_TOKEN が設定されていません。.env.local またはVercelの環境変数を確認してください。"
    )
  }

  return new Client({ auth: token, notionVersion: NOTION_VERSION })
}
