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
    <div className="space-y-5 sm:space-y-7">
      <fieldset className="grid grid-cols-3 gap-2 sm:gap-4">
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
              className={cn(
                "relative min-w-0 rounded-xl border bg-background px-2 py-3 text-left shadow-xs transition-[border-color,box-shadow,transform] outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:px-4 sm:py-4",
                isSelected
                  ? "border-foreground shadow-sm ring-2 ring-foreground"
                  : "border-border hover:border-foreground/40"
              )}
            >
              <span className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground sm:text-sm">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: chartConfig[metric.value].color,
                  }}
                  aria-hidden="true"
                />
                <span className="truncate">{metric.label}</span>
                <span className="hidden font-normal min-[390px]:inline">
                  ({metric.unit})
                </span>
              </span>
              <span className="mt-1.5 flex items-baseline gap-1 sm:mt-2">
                <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums sm:text-3xl">
                  {summary.value === null ? "—" : summary.value.toFixed(1)}
                </span>
                {summary.value !== null && (
                  <span className="text-[10px] font-medium text-muted-foreground sm:text-xs">
                    {metric.unit}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "mt-2 flex min-h-5 items-center gap-0.5 text-[10px] font-medium tabular-nums sm:text-xs",
                  summary.difference === null && "text-muted-foreground"
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

      <div className="space-y-3">
        <div className="flex min-h-10 items-end justify-between gap-4 px-2 sm:px-0">
          <div>
            <p className="text-xs text-muted-foreground">選択中の測定日</p>
            <p className="mt-0.5 font-medium">
              {selectedLog ? formatDate(selectedLog.date) : "記録なし"}
            </p>
          </div>
          {selectedValue !== null && (
            <p
              className="text-right text-sm font-semibold tabular-nums sm:text-base"
              aria-live="polite"
            >
              {selectedOption.label} {selectedValue.toFixed(1)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">
                {selectedOption.unit}
              </span>
            </p>
          )}
        </div>

        {latestAxisDate === null ? (
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-dashed bg-muted/20 px-6 text-center sm:min-h-80">
            <p className="font-medium">この指標のデータはありません</p>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="h-[270px] w-full sm:h-[400px] [&_.recharts-responsive-container]:flex-1"
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
                ticks={latestAxisDate ? [latestAxisDate] : []}
                interval={0}
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
                connectNulls={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </div>
    </div>
  )
}
