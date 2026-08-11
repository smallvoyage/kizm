import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FitnessLog, NutritionMetric } from "@/lib/fitness"
import type { NutritionGoals } from "@/lib/nutrition-goals"

const metrics: Array<{
  key: NutritionMetric
  label: string
  unit: "kcal" | "g"
  color: string
}> = [
  {
    key: "calories",
    label: "摂取カロリー",
    unit: "kcal",
    color: "var(--chart-1)",
  },
  {
    key: "protein",
    label: "たんぱく質",
    unit: "g",
    color: "var(--chart-2)",
  },
  {
    key: "fat",
    label: "脂質",
    unit: "g",
    color: "var(--chart-3)",
  },
  {
    key: "carbs",
    label: "炭水化物",
    unit: "g",
    color: "var(--chart-4)",
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
      {metrics.map((metric) => {
        const value = log?.[metric.key] ?? null
        const goal = goals[metric.key]
        const remaining = value === null ? null : goal - value
        const progress =
          value === null ? 0 : Math.min(Math.max((value / goal) * 100, 0), 100)
        const accessibleValue =
          value === null ? undefined : Math.min(Math.max(value, 0), goal)
        return (
          <Card
            key={metric.key}
            className="min-w-0 gap-3 shadow-sm [--card-spacing:--spacing(3)] sm:gap-4 sm:[--card-spacing:--spacing(4)]"
          >
            <CardHeader className="items-center text-center">
              <CardTitle className="whitespace-nowrap text-sm text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <div
                className="relative size-20 shrink-0 min-[360px]:size-24 lg:size-28"
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
                <svg
                  className="size-full -rotate-90"
                  viewBox="0 0 100 100"
                  aria-hidden="true"
                >
                  <circle
                    className="fill-none stroke-muted"
                    cx="50"
                    cy="50"
                    r="44"
                    strokeWidth="8"
                  />
                  <circle
                    className="fill-none transition-[stroke-dashoffset]"
                    cx="50"
                    cy="50"
                    r="44"
                    pathLength="100"
                    strokeDasharray="100"
                    strokeLinecap="round"
                    strokeWidth="8"
                    style={{
                      stroke: metric.color,
                      strokeDashoffset: 100 - progress,
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                  <span className="text-xl font-semibold tracking-tight tabular-nums min-[360px]:text-2xl">
                    {value === null ? "—" : formatAmount(value)}
                  </span>
                  {value !== null && (
                    <span className="mt-1 text-xs font-medium text-muted-foreground">
                      {metric.unit}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-center text-xs leading-tight">
                <p className="font-medium">
                  {remaining === null
                    ? "記録なし"
                    : remaining > 0
                      ? `残り ${formatAmount(remaining)} ${metric.unit}`
                      : remaining === 0
                        ? "目標達成"
                        : `${formatAmount(Math.abs(remaining))} ${metric.unit} 超過`}
                </p>
                <p className="text-muted-foreground">
                  目標 {formatAmount(goal)} {metric.unit}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
