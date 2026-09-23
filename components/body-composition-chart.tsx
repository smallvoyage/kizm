"use client"

import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { type CSSProperties, useMemo, useState } from "react"
import { CompositionPlot } from "@/components/composition-plot"
import type { BodyCompositionMetric, FitnessLog } from "@/lib/fitness"
import {
  type CompositionPeriod,
  getCompositionView,
} from "@/lib/fitness/body-composition"
import { formatNumber } from "@/lib/format-number"
import { cn } from "@/lib/utils"

const periods: { value: CompositionPeriod; label: string }[] = [
  { value: 7, label: "7日" },
  { value: 30, label: "30日" },
  { value: "all", label: "取得済み全体" },
]

const metricOptions: Array<{
  value: BodyCompositionMetric
  label: string
  unit: "kg" | "%"
  differenceUnit: "kg" | "%"
  color: string
  soft: string
}> = [
  {
    value: "weight",
    label: "体重",
    unit: "kg",
    differenceUnit: "kg",
    color: "var(--color-weight)",
    soft: "var(--color-weight-soft)",
  },
  {
    value: "bodyFat",
    label: "体脂肪率",
    unit: "%",
    differenceUnit: "%",
    color: "var(--color-body-fat)",
    soft: "var(--color-body-fat-soft)",
  },
  {
    value: "muscleMass",
    label: "筋肉量",
    unit: "kg",
    differenceUnit: "kg",
    color: "var(--color-muscle-mass)",
    soft: "var(--color-muscle-mass-soft)",
  },
]

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatDifference(value: number): string {
  if (value === 0) return "±0.0"
  return `${value > 0 ? "+" : ""}${formatNumber(value, {
    fractionDigits: 1,
    fixed: true,
  })}`
}

type BodyCompositionChartProps = {
  logs: FitnessLog[]
  referenceDate: string
}

export function BodyCompositionChart({
  logs,
  referenceDate,
}: BodyCompositionChartProps) {
  const [period, setPeriod] = useState<CompositionPeriod>(30)
  const [selectedMetric, setSelectedMetric] =
    useState<BodyCompositionMetric>("weight")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const view = useMemo(
    () =>
      getCompositionView(
        logs,
        referenceDate,
        period,
        selectedMetric,
        selectedDate
      ),
    [logs, referenceDate, period, selectedMetric, selectedDate]
  )
  const { selectedLog, summaries } = view
  const selectedOption =
    metricOptions.find((option) => option.value === selectedMetric) ??
    metricOptions[0]

  const selectedValue = summaries[selectedMetric].value
  const selectedMetricStyle = {
    "--selected-metric-color": selectedOption.color,
    "--selected-metric-soft": selectedOption.soft,
  } as CSSProperties

  return (
    <div className="composition-workbench" style={selectedMetricStyle}>
      <fieldset className="composition-selector">
        <legend className="sr-only">表示する身体組成の指標</legend>
        {metricOptions.map((metric) => {
          const summary = summaries[metric.value]
          const isSelected = selectedMetric === metric.value
          const DifferenceIcon =
            summary.difference === null || summary.difference === 0
              ? Minus
              : summary.difference > 0
                ? TrendingUp
                : TrendingDown

          return (
            <button
              key={metric.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setSelectedDate(
                  getCompositionView(
                    logs,
                    referenceDate,
                    period,
                    metric.value,
                    selectedLog?.date ?? null
                  ).selectedLog?.date ?? null
                )
                setSelectedMetric(metric.value)
              }}
              className={cn("composition-option", isSelected && "is-selected")}
              style={
                {
                  "--metric-color": metric.color,
                  "--metric-soft": metric.soft,
                } as CSSProperties
              }
            >
              <span className="composition-option-label">
                <span>{metric.label}</span>
              </span>
              <span className="composition-option-value">
                <strong>
                  {summary.value === null
                    ? "—"
                    : formatNumber(summary.value, {
                        fractionDigits: 1,
                        fixed: true,
                      })}
                </strong>
                {summary.value !== null && <span>{metric.unit}</span>}
              </span>
              <span
                className={cn(
                  "composition-difference",
                  summary.difference === null && "is-muted"
                )}
              >
                <DifferenceIcon
                  className="size-3 shrink-0"
                  aria-hidden="true"
                />
                {summary.difference === null
                  ? "比較なし"
                  : `${formatDifference(summary.difference)} ${metric.differenceUnit}`}
              </span>
            </button>
          )
        })}
      </fieldset>

      <fieldset className="composition-periods">
        <legend className="sr-only">表示期間</legend>
        {periods.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={period === option.value}
            onClick={() => {
              setSelectedDate(
                getCompositionView(
                  logs,
                  referenceDate,
                  option.value,
                  selectedMetric,
                  selectedLog?.date ?? null
                ).selectedLog?.date ?? null
              )
              setPeriod(option.value)
            }}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      <div className="composition-chart-area">
        <div
          className="composition-chart-meta"
          aria-live="polite"
          aria-atomic="true"
        >
          <div>
            <p>測定日</p>
            <strong>
              {selectedLog ? formatDate(selectedLog.date) : "記録なし"}
            </strong>
          </div>
          {selectedValue !== null && (
            <div className="composition-selected-value">
              <p>{selectedOption.label}</p>
              <strong>
                {formatNumber(selectedValue, {
                  fractionDigits: 1,
                  fixed: true,
                })}
              </strong>
              <span>{selectedOption.unit}</span>
            </div>
          )}
        </div>

        {selectedLog === null ? (
          <div className="composition-empty">
            <p>この期間の指標のデータはありません。</p>
          </div>
        ) : (
          <CompositionPlot
            logs={view.visibleLogs}
            selectableLogs={view.selectableLogs}
            selectedLog={selectedLog}
            metric={selectedMetric}
            color={selectedOption.color}
            label={selectedOption.label}
            ticks={view.ticks}
            onSelect={setSelectedDate}
          />
        )}
      </div>
    </div>
  )
}
