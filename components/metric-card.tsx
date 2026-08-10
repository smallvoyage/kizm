import { CalendarDays, Minus, TrendingDown, TrendingUp } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { MetricSummary } from "@/lib/fitness"
import { cn } from "@/lib/utils"

type MetricCardProps = {
  title: string
  summary: MetricSummary
  unit: "kg" | "%"
  differenceUnit: "kg" | "pt"
}

function formatDifference(value: number): string {
  if (value === 0) return "±0.0"
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

export function MetricCard({
  title,
  summary,
  unit,
  differenceUnit,
}: MetricCardProps) {
  const DifferenceIcon =
    summary.difference === null || summary.difference === 0
      ? Minus
      : summary.difference > 0
        ? TrendingUp
        : TrendingDown

  return (
    <Card className="gap-3 shadow-sm [--card-spacing:--spacing(3)] sm:gap-5 sm:[--card-spacing:--spacing(4)]">
      <CardHeader>
        <CardTitle className="whitespace-nowrap text-xs text-muted-foreground sm:text-sm">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 sm:space-y-3">
        <div className="flex items-baseline gap-1 sm:gap-2">
          <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {summary.value === null ? "—" : summary.value.toFixed(1)}
          </span>
          {summary.value !== null && (
            <span className="text-xs font-medium text-muted-foreground sm:text-sm">
              {unit}
            </span>
          )}
        </div>

        <div className="flex min-h-5 items-center justify-between gap-1 text-[10px] text-muted-foreground sm:gap-3 sm:text-xs">
          <span
            className={cn(
              "inline-flex min-w-0 items-center gap-0.5 font-medium tabular-nums sm:gap-1",
              summary.difference !== null && "text-foreground"
            )}
          >
            <DifferenceIcon
              className="size-3 shrink-0 sm:size-3.5"
              aria-hidden="true"
            />
            {summary.difference === null
              ? "比較できる記録なし"
              : `${formatDifference(summary.difference)} ${differenceUnit}`}
          </span>
          {summary.date && (
            <span className="hidden items-center gap-1 whitespace-nowrap lg:inline-flex">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatDate(summary.date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
