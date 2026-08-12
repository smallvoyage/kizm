"use client"

import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
} from "@/components/ui/chart"
import type { BodyCompositionMetric, FitnessLog } from "@/lib/fitness"
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
  differenceUnit: "kg" | "pt"
}> = [
  { value: "weight", label: "体重", unit: "kg", differenceUnit: "kg" },
  {
    value: "bodyFat",
    label: "体脂肪率",
    unit: "%",
    differenceUnit: "pt",
  },
  {
    value: "muscleMass",
    label: "筋肉量",
    unit: "kg",
    differenceUnit: "kg",
  },
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
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}`
}

function latestBodyCompositionLog(logs: FitnessLog[]) {
  return logs.findLast((log) =>
    metricOptions.some((metric) => log[metric.value] !== null)
  )
}

type BodyCompositionChartProps = {
  logs: FitnessLog[]
}

export function BodyCompositionChart({ logs }: BodyCompositionChartProps) {
  const initialLog = latestBodyCompositionLog(logs)
  const [selectedMetric, setSelectedMetric] =
    useState<BodyCompositionMetric>("weight")
  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialLog?.date ?? null
  )

  const latestAxisDate = useMemo(
    () => logs.findLast((log) => log[selectedMetric] !== null)?.date ?? null,
    [logs, selectedMetric]
  )
  const selectedLog =
    logs.find((log) => log.date === selectedDate) ?? initialLog ?? null
  const selectedOption =
    metricOptions.find((option) => option.value === selectedMetric) ??
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

  const selectedValue = summaries[selectedMetric].value

  return (
    <div className="composition-workbench">
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
              onClick={() => setSelectedMetric(metric.value)}
              className={cn("composition-option", isSelected && "is-selected")}
            >
              <span className="composition-option-label">
                <span>{metric.label}</span>
                <span>({metric.unit})</span>
              </span>
              <span className="composition-option-value">
                <strong>
                  {summary.value === null ? "—" : summary.value.toFixed(1)}
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
            <p>選択中の測定日</p>
            <strong>
              {selectedLog ? formatDate(selectedLog.date) : "記録なし"}
            </strong>
          </div>
          {selectedValue !== null && (
            <p className="composition-selected-value" aria-live="polite">
              {selectedOption.label} {selectedValue.toFixed(1)}
              <span>{selectedOption.unit}</span>
            </p>
          )}
        </div>

        {latestAxisDate === null ? (
          <div className="composition-empty">
            <p>この指標のデータはまだありません。</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            initialDimension={{ width: 240, height: 272 }}
            className="composition-chart [&_.recharts-responsive-container]:flex-1"
          >
            <LineChart
              accessibilityLayer
              data={logs}
              margin={{ top: 16, right: 12, bottom: 8, left: 4 }}
              onClick={({ activeLabel }) => {
                if (typeof activeLabel === "string") {
                  setSelectedDate(activeLabel)
                }
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={12}
                minTickGap={32}
                tickFormatter={formatAxisDate}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickMargin={8}
                width={42}
                domain={[
                  (dataMin: number) => dataMin - Y_AXIS_PADDING,
                  (dataMax: number) => dataMax + Y_AXIS_PADDING,
                ]}
                tickFormatter={(value: number) => value.toFixed(1)}
              />
              <ChartTooltip
                trigger="click"
                cursor={false}
                content={() => null}
              />
              <Line
                dataKey={selectedMetric}
                name={selectedOption.label}
                type="monotone"
                isAnimationActive={false}
                stroke="var(--muted-foreground)"
                strokeWidth={2}
                strokeOpacity={0.45}
                dot={{
                  r: 4,
                  fill: `var(--color-${selectedMetric})`,
                  stroke: "var(--background)",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: `var(--color-${selectedMetric})`,
                  stroke: "var(--background)",
                  strokeWidth: 3,
                }}
                connectNulls={true}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
