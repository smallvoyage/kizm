import { createHash, timingSafeEqual } from "node:crypto"

import {
  getDailyNutrition,
  getTokyoDate,
} from "@/lib/fitness/daily-nutrition/daily-nutrition"
import { fitnessDataSource } from "@/lib/fitness-data-source"
import { NUTRITION_GOALS } from "@/lib/nutrition-goals"
import { formatShortcutNutrition } from "@/lib/shortcut-nutrition/shortcut-nutrition"

function respond(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  })
}

export async function GET(request: Request) {
  const authorization = request.headers.get("authorization")
  const token = process.env.KIZM_SHORTCUT_TOKEN?.trim()
  if (!token)
    return respond(
      {
        error: "unavailable",
        displayText: "ショートカットAPIが設定されていません。",
      },
      503
    )
  const hash = (value: string) => createHash("sha256").update(value).digest()
  if (
    !authorization ||
    !timingSafeEqual(hash(authorization), hash(`Bearer ${token}`))
  ) {
    return respond(
      {
        error: "unauthorized",
        displayText:
          "認証できません。ショートカットのトークンを確認してください。",
      },
      401
    )
  }
  try {
    let date = getTokyoDate(new Date())
    let log = await fitnessDataSource.getDay(date)
    // 通信中に日本時間の日付が変わった場合は、新しい今日を取得する。
    const currentDate = getTokyoDate(new Date())
    if (currentDate !== date) {
      date = currentDate
      log = await fitnessDataSource.getDay(date)
    }
    const fetchedAt = new Date()
    const summary = getDailyNutrition(log, date, NUTRITION_GOALS)
    return respond({
      ...summary,
      fetchedAt: fetchedAt.toISOString(),
      displayText: formatShortcutNutrition(summary, fetchedAt),
    })
  } catch {
    return respond(
      {
        error: "data_unavailable",
        displayText:
          "食事データを取得できませんでした。少し待って再実行してください。",
      },
      502
    )
  }
}
