import { CalendarDays } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FitnessLog, NutritionMetric } from "@/lib/fitness"
import type { NutritionGoals } from "@/lib/nutrition-goals"

const metrics: Array<{
  key: NutritionMetric
  label: string
  unit: "kcal" | "g"
}> = [
  { key: "calories", label: "摂取カロリー", unit: "kcal" },
  { key: "protein", label: "たんぱく質", unit: "g" },
  { key: "fat", label: "脂質", unit: "g" },
  { key: "carbs", label: "炭水化物", unit: "g" },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

export function NutritionSummary({
  log,
  goals,
}: {
  log: FitnessLog | null
  goals: NutritionGoals
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const value = log?.[metric.key] ?? null
        const goal = goals[metric.key]
        const remaining = value === null ? null : goal - value
        const progress =
          value === null ? 0 : Math.min(Math.max((value / goal) * 100, 0), 100)
        return (
          <Card key={metric.key} className="gap-5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  {value === null ? "—" : value.toFixed(1)}
                </span>
                {value !== null && (
                  <span className="text-sm font-medium text-muted-foreground">
                    {metric.unit}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium">
                    {remaining === null
                      ? "記録なし"
                      : remaining > 0
                        ? `残り ${remaining.toFixed(1)} ${metric.unit}`
                        : remaining === 0
                          ? "目標達成"
                          : `目標を ${Math.abs(remaining).toFixed(1)} ${metric.unit} 超過`}
                  </span>
                  <span className="whitespace-nowrap text-muted-foreground">
                    目標 {goal.toFixed(1)} {metric.unit}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-label={`${metric.label}の目標達成率`}
                  aria-valuemin={0}
                  aria-valuemax={goal}
                  aria-valuenow={value === null ? 0 : Math.min(value, goal)}
                >
                  <div
                    className="h-full rounded-full bg-foreground transition-[width]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
              <div className="flex min-h-5 items-center text-xs text-muted-foreground">
                {log && (
                  <span className="inline-flex items-center gap-1 whitespace-nowrap">
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                    {formatDate(log.date)}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
