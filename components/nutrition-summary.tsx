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

export function NutritionSummary({
  log,
  goals,
}: {
  log: FitnessLog | null
  goals: NutritionGoals
}) {
  return (
    <div className="nutrition-grid">
      {metrics.map((metric) => {
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
          "--nutrition-progress": `${progress * 3.6}deg`,
        } as CSSProperties

        return (
          <article
            key={metric.key}
            className="nutrition-metric"
            style={metricStyle}
          >
            <header className="nutrition-metric-heading">
              <h3>{metric.label}</h3>
              <p>
                目標 {formatAmount(goal)} {metric.unit}
              </p>
            </header>

            <div className="nutrition-metric-reading">
              <div
                className="nutrition-progress"
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
                <span>{value === null ? "—" : `${Math.round(progress)}%`}</span>
              </div>
              <p className="nutrition-value">
                <strong>{value === null ? "—" : formatAmount(value)}</strong>
                {value !== null && <span>{metric.unit}</span>}
              </p>
            </div>
            <p className="nutrition-meta">
              {remaining === null
                ? "記録なし"
                : remaining > 0
                  ? `残り ${formatAmount(remaining)} ${metric.unit}`
                  : remaining === 0
                    ? "目標達成"
                    : `${formatAmount(Math.abs(remaining))} ${metric.unit} 超過`}
            </p>
          </article>
        )
      })}
    </div>
  )
}
