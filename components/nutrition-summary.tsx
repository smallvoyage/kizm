import type { CSSProperties } from "react"

import type { FitnessLog, NutritionMetric } from "@/lib/fitness"
import type { NutritionGoals } from "@/lib/nutrition-goals"

const metrics: Array<{
  key: NutritionMetric
  label: string
  unit: "kcal" | "g"
}> = [
  {
    key: "calories",
    label: "摂取カロリー",
    unit: "kcal",
  },
  {
    key: "protein",
    label: "たんぱく質",
    unit: "g",
  },
  {
    key: "fat",
    label: "脂質",
    unit: "g",
  },
  {
    key: "carbs",
    label: "炭水化物",
    unit: "g",
  },
]

function formatAmount(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
}

function formatStatus(remaining: number | null, unit: "kcal" | "g"): string {
  if (remaining === null) return "記録なし"
  if (remaining > 0) return `残り ${formatAmount(remaining)} ${unit}`
  if (remaining === 0) return "目標達成"
  return `${formatAmount(Math.abs(remaining))} ${unit} 超過`
}

export function NutritionSummary({
  log,
  goals,
}: {
  log: FitnessLog | null
  goals: NutritionGoals
}) {
  return (
    <section className="nutrition-summary" aria-label="最新の食事状況">
      {metrics.map((metric, index) => {
        const value = log?.[metric.key] ?? null
        const goal = goals[metric.key]
        const remaining = value === null ? null : goal - value
        const progress =
          value === null ? 0 : Math.min(Math.max((value / goal) * 100, 0), 100)
        const accessibleValue =
          value === null ? undefined : Math.min(Math.max(value, 0), goal)
        const metricStyle = {
          "--metric-color": `var(--color-${metric.key})`,
          "--metric-soft": `var(--color-${metric.key}-soft)`,
          "--nutrition-progress": progress / 100,
        } as CSSProperties

        return (
          <article
            key={metric.key}
            className="nutrition-row"
            data-featured={index === 0 ? "true" : undefined}
            data-status={
              remaining === null ? "empty" : remaining < 0 ? "over" : "within"
            }
            style={metricStyle}
          >
            <header className="nutrition-row-heading">
              <h3>{metric.label}</h3>
              <p>{formatStatus(remaining, metric.unit)}</p>
            </header>

            <p className="nutrition-row-value">
              <strong>{value === null ? "—" : formatAmount(value)}</strong>
              <span>
                / {formatAmount(goal)} {metric.unit}
              </span>
            </p>

            <div
              className="nutrition-bar"
              role="progressbar"
              aria-label={`${metric.label}の目標達成率`}
              aria-valuemin={0}
              aria-valuemax={goal}
              aria-valuenow={accessibleValue}
              aria-valuetext={
                value === null
                  ? "記録なし"
                  : `${formatAmount(value)} ${metric.unit}、目標 ${formatAmount(goal)} ${metric.unit}`
              }
            >
              <span />
            </div>
          </article>
        )
      })}
    </section>
  )
}
