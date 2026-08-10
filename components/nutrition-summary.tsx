import { CalendarDays } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FitnessLog, NutritionMetric } from "@/lib/fitness"

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

export function NutritionSummary({ log }: { log: FitnessLog | null }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => {
        const value = log?.[metric.key] ?? null
        return (
          <Card key={metric.key} className="gap-5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
