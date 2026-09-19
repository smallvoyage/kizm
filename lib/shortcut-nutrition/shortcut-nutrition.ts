import type { getDailyNutrition } from "@/lib/fitness/daily-nutrition/daily-nutrition"
import { formatNumber } from "@/lib/format-number"

export function formatShortcutNutrition(
  summary: ReturnType<typeof getDailyNutrition>,
  fetchedAt: Date
): string {
  const lines = [`今日の食事 (${summary.date})`]
  if (summary.status === "empty") {
    lines.push("今日はまだ記録がありません")
  } else {
    for (const [key, label, unit] of [
      ["calories", "カロリー", "kcal"],
      ["protein", "P", "g"],
      ["fat", "F", "g"],
      ["carbs", "C", "g"],
    ] as const) {
      const { consumed, remaining } = summary.metrics[key]
      const status =
        remaining === null
          ? "記録なし"
          : remaining < 0
            ? `${formatNumber(Math.abs(remaining))} ${unit}超過`
            : remaining === 0
              ? "目標達成"
              : `残り ${formatNumber(remaining)} ${unit}`
      lines.push(
        consumed === null
          ? `${label} 記録なし`
          : `${label} ${formatNumber(consumed)} ${unit}\n${status}`
      )
    }
  }
  lines.push(
    `取得 ${new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(fetchedAt)}`
  )
  return lines.join("\n\n")
}
