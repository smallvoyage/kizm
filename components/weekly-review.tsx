"use client"

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Minus,
  Scale,
  TrendingDown,
  TrendingUp,
  Utensils,
} from "lucide-react"
import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { FitnessLog, NutritionMetric } from "@/lib/fitness"
import type { NutritionGoals } from "@/lib/nutrition-goals"
import {
  type GoalAchievement,
  getWeeklyReview,
  getWeekStart,
  shiftDate,
  type WeeklyAverage,
  type WeeklyMetricChange,
} from "@/lib/weekly-review"

const nutritionMetrics: Array<{
  key: NutritionMetric
  label: string
  shortLabel: string
  unit: "kcal" | "g"
}> = [
  {
    key: "calories",
    label: "平均摂取カロリー",
    shortLabel: "カロリー",
    unit: "kcal",
  },
  { key: "protein", label: "平均たんぱく質", shortLabel: "P", unit: "g" },
  { key: "fat", label: "平均脂質", shortLabel: "F", unit: "g" },
  { key: "carbs", label: "平均炭水化物", shortLabel: "C", unit: "g" },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatValue(value: number | null, digits = 1) {
  if (value === null) return "—"
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(digits)
}

function formatDifference(value: number, digits = 1) {
  if (value === 0) return `±${value.toFixed(digits)}`
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`
}

function Comparison({ value, unit }: { value: number | null; unit: string }) {
  const Icon =
    value === null || value === 0
      ? Minus
      : value > 0
        ? TrendingUp
        : TrendingDown

  return (
    <span className="inline-flex min-h-5 items-center gap-1 text-[11px] font-medium text-muted-foreground tabular-nums">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {value === null
        ? "前週比較なし"
        : `前週比 ${formatDifference(value)} ${unit}`}
    </span>
  )
}

function AverageCard({
  label,
  shortLabel,
  average,
  unit,
}: {
  label: string
  shortLabel: string
  average: WeeklyAverage
  unit: string
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-muted/20 p-3 sm:p-4">
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">
        <span className="sm:hidden">{shortLabel}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          {formatValue(average.value)}
        </span>
        {average.value !== null && (
          <span className="text-xs font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      <div className="mt-2">
        <Comparison value={average.previousDifference} unit={unit} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {average.recordedDays === 0
          ? "記録なし"
          : `${average.recordedDays}日分の平均`}
      </p>
    </div>
  )
}

function GoalRow({
  label,
  achievement,
}: {
  label: string
  achievement: GoalAchievement
}) {
  const rate = achievement.rate ?? 0

  return (
    <div className="space-y-2 rounded-xl border p-3 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {achievement.recordedDays === 0
              ? "対象の記録なし"
              : `${achievement.achievedDays} / ${achievement.recordedDays} 記録日`}
          </p>
        </div>
        <span className="text-xl font-semibold tabular-nums">
          {achievement.rate === null ? "—" : `${Math.round(achievement.rate)}%`}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label={`${label}の達成率`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={achievement.rate === null ? undefined : Math.round(rate)}
        aria-valuetext={
          achievement.rate === null ? "記録なし" : `${Math.round(rate)}%`
        }
      >
        <div
          className="h-full rounded-full bg-foreground transition-[width]"
          style={{ width: `${Math.min(Math.max(rate, 0), 100)}%` }}
        />
      </div>
    </div>
  )
}

function BodyMetric({
  label,
  value,
  unit,
}: {
  label: string
  value: number | null
  unit: string
}) {
  return (
    <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
      <p className="text-xs font-medium text-muted-foreground sm:text-sm">
        {label}
      </p>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
          {formatValue(value)}
        </span>
        {value !== null && (
          <span className="text-xs font-medium text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
    </div>
  )
}

function OptionalChange({
  label,
  change,
  unit,
}: {
  label: string
  change: WeeklyMetricChange
  unit: string
}) {
  if (change.start === null && change.end === null) return null

  return (
    <div className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-2.5 sm:px-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {change.start === null || change.end === null
            ? "比較できる記録なし"
            : `${formatValue(change.start)} → ${formatValue(change.end)} ${unit}`}
        </p>
      </div>
      <span className="shrink-0 font-semibold tabular-nums">
        {change.difference === null
          ? "—"
          : `${formatDifference(change.difference)} ${unit}`}
      </span>
    </div>
  )
}

export function WeeklyReview({
  logs,
  goals,
}: {
  logs: FitnessLog[]
  goals: NutritionGoals
}) {
  const firstWeek = getWeekStart(logs[0]?.date ?? "")
  const latestWeek = getWeekStart(logs.at(-1)?.date ?? "")
  const [selectedWeek, setSelectedWeek] = useState(latestWeek)
  const review = useMemo(
    () => (selectedWeek ? getWeeklyReview(logs, selectedWeek, goals) : null),
    [goals, logs, selectedWeek]
  )

  if (!review || !selectedWeek || !firstWeek || !latestWeek) return null

  const previousWeek = shiftDate(selectedWeek, -7)
  const nextWeek = shiftDate(selectedWeek, 7)
  const canGoPrevious = previousWeek !== null && previousWeek >= firstWeek
  const canGoNext = nextWeek !== null && nextWeek <= latestWeek
  const weight = review.bodyComposition.weight

  return (
    <section aria-labelledby="weekly-review-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground">
            WEEKLY REVIEW
          </p>
          <h2
            id="weekly-review-heading"
            className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl"
          >
            週間レビュー
          </h2>
        </div>
        <div className="flex items-center rounded-xl border bg-background p-1 shadow-xs">
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => previousWeek && setSelectedWeek(previousWeek)}
            disabled={!canGoPrevious}
            aria-label="前の週を表示"
          >
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
          <p className="min-w-28 px-2 text-center text-sm font-medium tabular-nums sm:min-w-36">
            {formatDate(review.startDate)} – {formatDate(review.endDate)}
          </p>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-lg transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-35"
            onClick={() => nextWeek && setSelectedWeek(nextWeek)}
            disabled={!canGoNext}
            aria-label="次の週を表示"
          >
            <ChevronRight className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Card className="overflow-hidden gap-0 shadow-sm">
        <CardHeader className="border-b bg-muted/20 px-4 py-4 sm:px-(--card-spacing)">
          <div className="flex items-center gap-2">
            <CalendarDays
              className="size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <CardTitle className="text-base sm:text-lg">
              この週のサマリー
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 px-4 py-5 lg:grid-cols-2 lg:px-(--card-spacing) lg:py-6">
          <section
            aria-labelledby="weekly-nutrition-heading"
            className="min-w-0 space-y-4"
          >
            <div className="flex items-center gap-2">
              <Utensils
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              />
              <h3 id="weekly-nutrition-heading" className="font-semibold">
                食事
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              {nutritionMetrics.map((metric) => (
                <AverageCard
                  key={metric.key}
                  label={metric.label}
                  shortLabel={metric.shortLabel}
                  average={review.nutrition.averages[metric.key]}
                  unit={metric.unit}
                />
              ))}
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 pt-1">
                <CircleGauge
                  className="size-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <h4 className="text-sm font-semibold">目標達成</h4>
              </div>
              <GoalRow
                label="カロリー目標"
                achievement={review.nutrition.calorieGoal}
              />
              <GoalRow
                label="たんぱく質目標"
                achievement={review.nutrition.proteinGoal}
              />
            </div>
          </section>

          <section
            aria-labelledby="weekly-body-heading"
            className="min-w-0 space-y-4 lg:border-l lg:pl-6"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Scale
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 id="weekly-body-heading" className="font-semibold">
                  身体組成
                </h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {review.bodyComposition.recordedDays === 0
                  ? "記録なし"
                  : `${review.bodyComposition.recordedDays}日記録`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <BodyMetric label="週初の体重" value={weight.start} unit="kg" />
              <BodyMetric label="週末の体重" value={weight.end} unit="kg" />
              <BodyMetric
                label="週内の増減"
                value={weight.difference}
                unit="kg"
              />
              <div className="rounded-xl border bg-muted/20 p-3 sm:p-4">
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                  7日平均体重
                </p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
                    {formatValue(review.bodyComposition.weightAverage.value)}
                  </span>
                  {review.bodyComposition.weightAverage.value !== null && (
                    <span className="text-xs font-medium text-muted-foreground">
                      kg
                    </span>
                  )}
                </p>
                <div className="mt-2">
                  <Comparison
                    value={
                      review.bodyComposition.weightAverage.previousDifference
                    }
                    unit="kg"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2.5">
              <OptionalChange
                label="体脂肪率の増減"
                change={review.bodyComposition.bodyFat}
                unit="pt"
              />
              <OptionalChange
                label="筋肉量の増減"
                change={review.bodyComposition.muscleMass}
                unit="kg"
              />
            </div>
          </section>
        </CardContent>
      </Card>
    </section>
  )
}
