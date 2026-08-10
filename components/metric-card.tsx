import { CalendarDays, Minus, TrendingDown, TrendingUp } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
    <Card className="gap-5 shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{title}</CardTitle>
        <CardDescription className="sr-only">
          Latest recorded {title.toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl">
            {summary.value === null ? "—" : summary.value.toFixed(1)}
          </span>
          {summary.value !== null && (
            <span className="text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </div>

        <div className="flex min-h-5 items-center justify-between gap-3 text-xs text-muted-foreground">
          <span
            className={cn(
              "inline-flex items-center gap-1 font-medium tabular-nums",
              summary.difference !== null && "text-foreground"
            )}
          >
            <DifferenceIcon className="size-3.5" aria-hidden="true" />
            {summary.difference === null
              ? "No previous record"
              : `${formatDifference(summary.difference)} ${differenceUnit}`}
          </span>
          {summary.date && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <CalendarDays className="size-3.5" aria-hidden="true" />
              {formatDate(summary.date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
