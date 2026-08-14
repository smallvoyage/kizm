"use client"

import {
  ChevronLeft,
  ChevronRight,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { useMemo, useState } from "react"

import type { FitnessLog, NutritionMetric } from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"
import {
  getWeeklyReview,
  getWeekStart,
  shiftDate,
  type WeeklyAverage,
  type WeeklyMetricChange,
} from "@/lib/weekly-review"

const nutritionMetrics: Array<{
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
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatValue(value: number | null, digits = 1) {
  if (value === null) return "—"
  return formatNumber(value, { fractionDigits: digits })
}

function formatDifference(value: number, digits = 1) {
  const formattedValue = formatNumber(value, {
    fractionDigits: digits,
    fixed: true,
  })
  if (value === 0) return `±${formattedValue}`
  return `${value > 0 ? "+" : ""}${formattedValue}`
}

function Comparison({
  value,
  unit,
  compact = false,
}: {
  value: number | null
  unit: string
  compact?: boolean
}) {
  const Icon =
    value === null || value === 0
      ? Minus
      : value > 0
        ? TrendingUp
        : TrendingDown
  const label =
    value === null
      ? "前週比較なし"
      : `前週比 ${formatDifference(value)} ${unit}`

  return (
    <span className="weekly-comparison">
      <Icon aria-hidden="true" />
      <span aria-hidden={compact && value !== null ? "true" : undefined}>
        {compact && value !== null
          ? `${formatDifference(value)} ${unit}`
          : label}
      </span>
      {compact && value !== null && <span className="sr-only">{label}</span>}
    </span>
  )
}

function AverageMetric({
  metric,
  average,
  featured = false,
}: {
  metric: (typeof nutritionMetrics)[number]
  average: WeeklyAverage
  featured?: boolean
}) {
  return (
    <article
      className="weekly-average"
      data-nutrition-metric={metric.key}
      data-featured={featured ? "true" : undefined}
      data-empty={average.value === null ? "true" : undefined}
    >
      <p className="weekly-average-label">
        <span aria-hidden="true" />
        {metric.label}
      </p>
      <p className="weekly-average-value">
        <strong>{formatValue(average.value)}</strong>
        {average.value !== null && <span>{metric.unit}</span>}
      </p>
      <div className="weekly-average-meta">
        <Comparison
          value={average.previousDifference}
          unit={metric.unit}
          compact={!featured}
        />
        <span>
          {average.recordedDays === 0
            ? "記録なし"
            : `${average.recordedDays}日平均`}
        </span>
      </div>
    </article>
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
    <div className="weekly-change">
      <dt>
        <span>{label}</span>
        <small>
          {change.start === null || change.end === null
            ? "比較できる記録なし"
            : `${formatValue(change.start)} → ${formatValue(change.end)} ${unit}`}
        </small>
      </dt>
      <dd>
        {change.difference === null
          ? "—"
          : `${formatDifference(change.difference)} ${unit}`}
      </dd>
    </div>
  )
}

export function WeeklyReview({ logs }: { logs: FitnessLog[] }) {
  const firstWeek = getWeekStart(logs[0]?.date ?? "")
  const latestWeek = getWeekStart(logs.at(-1)?.date ?? "")
  const [selectedWeek, setSelectedWeek] = useState(latestWeek)
  const review = useMemo(
    () => (selectedWeek ? getWeeklyReview(logs, selectedWeek) : null),
    [logs, selectedWeek]
  )

  if (!review || !selectedWeek || !firstWeek || !latestWeek) return null

  const previousWeek = shiftDate(selectedWeek, -7)
  const nextWeek = shiftDate(selectedWeek, 7)
  const canGoPrevious = previousWeek !== null && previousWeek >= firstWeek
  const canGoNext = nextWeek !== null && nextWeek <= latestWeek
  const weight = review.bodyComposition.weight
  const weightAverage = review.bodyComposition.weightAverage

  return (
    <section aria-labelledby="weekly-review-heading" className="weekly-review">
      <header className="dashboard-section-heading weekly-review-heading">
        <div>
          <h2 id="weekly-review-heading">週間レビュー</h2>
          <p>1週間の平均と目標達成を前週と比較</p>
        </div>
      </header>

      <nav className="weekly-review-navigation" aria-label="表示する週を選択">
        <button
          type="button"
          onClick={() => previousWeek && setSelectedWeek(previousWeek)}
          disabled={!canGoPrevious}
          aria-label="前の週を表示"
        >
          <ChevronLeft aria-hidden="true" />
        </button>
        <p aria-live="polite" aria-atomic="true">
          <strong>
            {formatDate(review.startDate)}–{formatDate(review.endDate)}
          </strong>
          <span>{selectedWeek === latestWeek ? "最新の週" : "過去の週"}</span>
        </p>
        <button
          type="button"
          onClick={() => nextWeek && setSelectedWeek(nextWeek)}
          disabled={!canGoNext}
          aria-label="次の週を表示"
        >
          <ChevronRight aria-hidden="true" />
        </button>
      </nav>

      <div className="weekly-review-sheet">
        <section
          className="weekly-review-group"
          aria-labelledby="weekly-nutrition-heading"
        >
          <header className="weekly-review-group-heading">
            <h3 id="weekly-nutrition-heading">食事</h3>
            <p>記録日の1日平均</p>
          </header>

          <div className="weekly-averages">
            {nutritionMetrics.map((metric, index) => (
              <AverageMetric
                key={metric.key}
                metric={metric}
                average={review.nutrition.averages[metric.key]}
                featured={index === 0}
              />
            ))}
          </div>
        </section>

        <section
          className="weekly-review-group"
          aria-labelledby="weekly-body-heading"
        >
          <header className="weekly-review-group-heading">
            <h3 id="weekly-body-heading">身体組成</h3>
            <p>
              {review.bodyComposition.recordedDays === 0
                ? "この週の記録なし"
                : `${review.bodyComposition.recordedDays}日分の記録`}
            </p>
          </header>

          <div
            className="weekly-weight"
            data-empty={weightAverage.value === null ? "true" : undefined}
          >
            <div className="weekly-weight-average">
              <p>7日平均体重</p>
              <div>
                <strong>{formatValue(weightAverage.value)}</strong>
                {weightAverage.value !== null && <span>kg</span>}
              </div>
              <Comparison value={weightAverage.previousDifference} unit="kg" />
            </div>

            <dl className="weekly-weight-range">
              <div>
                <dt>週初</dt>
                <dd>
                  {formatValue(weight.start)}
                  {weight.start !== null && <span> kg</span>}
                </dd>
              </div>
              <div>
                <dt>週末</dt>
                <dd>
                  {formatValue(weight.end)}
                  {weight.end !== null && <span> kg</span>}
                </dd>
              </div>
              <div>
                <dt>週内</dt>
                <dd>
                  {weight.difference === null
                    ? "—"
                    : `${formatDifference(weight.difference)} kg`}
                </dd>
              </div>
            </dl>
          </div>

          <dl className="weekly-changes">
            <OptionalChange
              label="体脂肪率"
              change={review.bodyComposition.bodyFat}
              unit="%"
            />
            <OptionalChange
              label="筋肉量"
              change={review.bodyComposition.muscleMass}
              unit="kg"
            />
          </dl>
        </section>
      </div>
    </section>
  )
}
