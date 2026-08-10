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
  { key: "fat", label: "脂質", unit: "g", color: "var(--chart-3)" },
  { key: "carbs", label: "炭水化物", unit: "g", color: "var(--chart-4)" },
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
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {metrics.map((metric) => {
        const value = log?.[metric.key] ?? null
        const goal = goals[metric.key]
        const remaining = value === null ? null : goal - value
        const progress =
          value === null ? 0 : Math.min(Math.max((value / goal) * 100, 0), 100)
        return (
          <Card
            key={metric.key}
            className="gap-2 shadow-sm [--card-spacing:--spacing(2)] sm:gap-4 sm:[--card-spacing:--spacing(4)]"
          >
            <CardHeader className="items-center px-1 text-center sm:px-(--card-spacing)">
              <CardTitle className="whitespace-nowrap text-[10px] text-muted-foreground sm:text-sm">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 px-1 sm:gap-3 sm:px-(--card-spacing)">
              <div
                className="relative size-16 shrink-0 sm:size-24"
                role="progressbar"
                aria-label={`${metric.label}の目標達成率`}
                aria-valuemin={0}
                aria-valuemax={goal}
                aria-valuenow={value === null ? 0 : Math.min(value, goal)}
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
                  <span className="text-sm font-semibold tracking-tight tabular-nums sm:text-2xl">
                    {value === null ? "—" : formatAmount(value)}
                  </span>
                  {value !== null && (
                    <span className="mt-1 text-[8px] font-medium text-muted-foreground sm:text-xs">
                      {metric.unit}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1 text-center text-[9px] leading-tight sm:text-xs">
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
