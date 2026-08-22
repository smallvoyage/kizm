"use client"

import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { type CSSProperties, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import {
  type BodyCompositionMetric,
  type ChartPeriod,
  type FitnessLog,
  filterLogsByPeriod,
} from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"
import { cn } from "@/lib/utils"

const chartConfig = {
  weight: { label: "体重", color: "var(--chart-1)" },
  bodyFat: { label: "体脂肪率", color: "var(--chart-2)" },
  muscleMass: { label: "筋肉量", color: "var(--chart-3)" },
} satisfies ChartConfig

const Y_AXIS_PADDING = 1

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

const periodOptions: Array<{ value: ChartPeriod; label: string }> = [
  { value: "7D", label: "7日" },
  { value: "30D", label: "30日" },
  { value: "90D", label: "90日" },
  { value: "ALL", label: "全期間" },
]

function formatAxisDate(date: string) {
  const [, month, day] = date.split("-")
  return `${Number(month)}/${Number(day)}`
}

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
  return `${value > 0 ? "+" : ""}${formatNumber(value, { fractionDigits: 1, fixed: true })}`
}

function latestBodyCompositionLog(logs: FitnessLog[]) {
  return logs.findLast((log) =>
    metricOptions.some((metric) => log[metric.value] !== null)
  )
}

type BodyCompositionChartProps = { logs: FitnessLog[]; referenceDate: string }

export function BodyCompositionChart({
  logs,
  referenceDate,
}: BodyCompositionChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>("30D")
  const [visibleMetrics, setVisibleMetrics] = useState<BodyCompositionMetric[]>(
    ["weight", "bodyFat", "muscleMass"]
  )
  const [activeMetric, setActiveMetric] =
    useState<BodyCompositionMetric>("weight")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const filteredLogs = useMemo(
    () => filterLogsByPeriod(logs, period, referenceDate),
    [logs, period, referenceDate]
  )
  const latestLog = latestBodyCompositionLog(filteredLogs) ?? null
  const selectedLog =
    filteredLogs.find((log) => log.date === selectedDate) ?? latestLog
  const activeOption =
    metricOptions.find((option) => option.value === activeMetric) ??
    metricOptions[0]

  const summaries = Object.fromEntries(
    metricOptions.map((metric) => {
      const selectedIndex = selectedLog
        ? logs.findIndex((log) => log.date === selectedLog.date)
        : -1
      const previousValue = logs
        .slice(0, selectedIndex)
        .findLast((log) => log[metric.value] !== null)?.[metric.value]
      const value = selectedLog?.[metric.value] ?? null
      return [
        metric.value,
        {
          value,
          difference:
            value !== null && previousValue != null
              ? value - previousValue
              : null,
        },
      ]
    })
  ) as Record<
    BodyCompositionMetric,
    { value: number | null; difference: number | null }
  >

  const handleMetricClick = (metric: BodyCompositionMetric) => {
    if (visibleMetrics.includes(metric)) {
      if (visibleMetrics.length === 1) return
      const nextMetrics = visibleMetrics.filter((value) => value !== metric)
      setVisibleMetrics(nextMetrics)
      if (activeMetric === metric) setActiveMetric(nextMetrics[0])
      return
    }
    setVisibleMetrics([...visibleMetrics, metric])
    setActiveMetric(metric)
  }

  const activeValue = summaries[activeMetric].value
  const activeMetricStyle = {
    "--selected-metric-color": activeOption.color,
    "--selected-metric-soft": activeOption.soft,
  } as CSSProperties

  return (
    <div className="composition-workbench" style={activeMetricStyle}>
      <fieldset className="composition-period-selector">
        <legend>表示期間</legend>
        <div>
          {periodOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={period === option.value}
              onClick={() => {
                setPeriod(option.value)
                setSelectedDate(null)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="composition-selector">
        <legend className="sr-only">表示する身体組成の指標</legend>
        {metricOptions.map((metric) => {
          const summary = summaries[metric.value]
          const isVisible = visibleMetrics.includes(metric.value)
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
              aria-pressed={isVisible}
              disabled={isVisible && visibleMetrics.length === 1}
              onClick={() => handleMetricClick(metric.value)}
              className={cn("composition-option", isVisible && "is-selected")}
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

      <div className="composition-chart-area">
        <div className="composition-chart-meta">
          <div>
            <p>測定日</p>
            <strong>
              {selectedLog ? formatDate(selectedLog.date) : "記録なし"}
            </strong>
          </div>
          {activeValue !== null && (
            <div className="composition-selected-value" aria-live="polite">
              <p>{activeOption.label}</p>
              <strong>
                {formatNumber(activeValue, { fractionDigits: 1, fixed: true })}
              </strong>
              <span>{activeOption.unit}</span>
            </div>
          )}
        </div>

        {latestLog === null ? (
          <div className="composition-empty">
            <p>この期間のデータはありません。</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            initialDimension={{ width: 240, height: 272 }}
            className="composition-chart [&_.recharts-responsive-container]:flex-1"
          >
            <LineChart
              accessibilityLayer
              data={filteredLogs}
              margin={{ top: 16, right: 4, bottom: 8, left: 4 }}
              onClick={({ activeLabel }) => {
                if (typeof activeLabel === "string")
                  setSelectedDate(activeLabel)
              }}
            >
              <CartesianGrid vertical={false} stroke="var(--color-rule)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                minTickGap={32}
                tickFormatter={formatAxisDate}
              />
              <YAxis
                yAxisId="kg"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={38}
                domain={[
                  (dataMin: number) => dataMin - Y_AXIS_PADDING,
                  (dataMax: number) => dataMax + Y_AXIS_PADDING,
                ]}
                tickFormatter={(value: number) =>
                  formatNumber(value, { fractionDigits: 1, fixed: true })
                }
              />
              <YAxis
                yAxisId="percent"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={34}
                domain={[
                  (dataMin: number) => dataMin - Y_AXIS_PADDING,
                  (dataMax: number) => dataMax + Y_AXIS_PADDING,
                ]}
                tickFormatter={(value: number) =>
                  formatNumber(value, { fractionDigits: 1, fixed: true })
                }
              />
              <ChartTooltip
                trigger="click"
                cursor={false}
                content={() => null}
              />
              {metricOptions.map((metric) =>
                visibleMetrics.includes(metric.value) ? (
                  <Line
                    key={metric.value}
                    yAxisId={metric.value === "bodyFat" ? "percent" : "kg"}
                    dataKey={metric.value}
                    name={metric.label}
                    type="monotone"
                    isAnimationActive={false}
                    stroke={metric.color}
                    strokeWidth={2.5}
                    dot={{
                      r: 3,
                      fill: metric.color,
                      stroke: "var(--background)",
                      strokeWidth: 2,
                    }}
                    activeDot={{
                      r: 5,
                      fill: metric.color,
                      stroke: "var(--background)",
                      strokeWidth: 3,
                    }}
                    connectNulls={true}
                  />
                ) : null
              )}
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
