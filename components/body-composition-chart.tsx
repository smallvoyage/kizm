"use client"

import { type ReactNode, useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  type BodyCompositionMetric,
  type ChartPeriod,
  type FitnessLog,
  filterLogsByPeriod,
} from "@/lib/fitness"

const chartConfig = {
  weight: { label: "Weight", color: "var(--chart-1)" },
  bodyFat: { label: "Body Fat", color: "var(--chart-2)" },
  muscleMass: { label: "Muscle Mass", color: "var(--chart-3)" },
} satisfies ChartConfig

const metricOptions: Array<{
  value: BodyCompositionMetric
  label: string
}> = [
  { value: "weight", label: "Weight" },
  { value: "bodyFat", label: "Body Fat" },
  { value: "muscleMass", label: "Muscle Mass" },
]

const periodOptions: ChartPeriod[] = ["7D", "30D", "90D", "ALL"]

function formatAxisDate(date: string) {
  const [, month, day] = date.split("-")
  return `${Number(month)}/${Number(day)}`
}

function formatTooltipDate(date: ReactNode) {
  if (typeof date !== "string") return date

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

type BodyCompositionChartProps = {
  logs: FitnessLog[]
  referenceDate: string
}

export function BodyCompositionChart({
  logs,
  referenceDate,
}: BodyCompositionChartProps) {
  const [period, setPeriod] = useState<ChartPeriod>("30D")
  const [visibleMetrics, setVisibleMetrics] = useState<BodyCompositionMetric[]>(
    ["weight", "bodyFat", "muscleMass"]
  )

  const filteredLogs = useMemo(
    () => filterLogsByPeriod(logs, period, referenceDate),
    [logs, period, referenceDate]
  )

  const handlePeriodChange = (values: string[]) => {
    const nextPeriod = values.at(-1) as ChartPeriod | undefined
    if (nextPeriod) setPeriod(nextPeriod)
  }

  const handleMetricsChange = (values: string[]) => {
    if (values.length > 0) {
      setVisibleMetrics(values as BodyCompositionMetric[])
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Period
          </p>
          <ToggleGroup
            aria-label="Chart period"
            value={[period]}
            onValueChange={handlePeriodChange}
            variant="outline"
            spacing={0}
          >
            {periodOptions.map((option) => (
              <ToggleGroupItem key={option} value={option} aria-label={option}>
                {option}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Metrics
          </p>
          <ToggleGroup
            aria-label="Visible metrics"
            value={visibleMetrics}
            onValueChange={handleMetricsChange}
            variant="outline"
            spacing={0}
            multiple
            className="max-w-full overflow-x-auto"
          >
            {metricOptions.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={`Toggle ${option.label}`}
                disabled={
                  visibleMetrics.length === 1 &&
                  visibleMetrics.includes(option.value)
                }
              >
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: chartConfig[option.value].color }}
                  aria-hidden="true"
                />
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <p className="text-xs text-muted-foreground">
            At least one metric remains visible.
          </p>
        </div>
      </div>

      {filteredLogs.length === 0 ? (
        <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center">
          <div>
            <p className="font-medium">No data in this period</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a longer period to view earlier records.
            </p>
          </div>
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="h-[360px] w-full sm:h-[440px]"
        >
          <LineChart
            accessibilityLayer
            data={filteredLogs}
            margin={{ top: 8, right: 4, bottom: 8, left: 4 }}
          >
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={28}
              tickFormatter={formatAxisDate}
            />
            <YAxis
              yAxisId="kg"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={38}
              unit=" kg"
              domain={["auto", "auto"]}
            />
            <YAxis
              yAxisId="percent"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={34}
              unit="%"
              domain={["auto", "auto"]}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={formatTooltipDate}
                  formatter={(value, name, item) => (
                    <div className="flex flex-1 items-center justify-between gap-6">
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <span
                          className="h-3 w-1 rounded-full"
                          style={{ backgroundColor: item.color }}
                          aria-hidden="true"
                        />
                        {chartConfig[name as keyof typeof chartConfig]?.label ??
                          name}
                      </span>
                      <span className="font-mono font-medium tabular-nums text-foreground">
                        {typeof value === "number" ? value.toFixed(1) : value}
                        {name === "bodyFat" ? " %" : " kg"}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {visibleMetrics.includes("weight") && (
              <Line
                yAxisId="kg"
                dataKey="weight"
                type="monotone"
                stroke="var(--color-weight)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            )}
            {visibleMetrics.includes("bodyFat") && (
              <Line
                yAxisId="percent"
                dataKey="bodyFat"
                type="monotone"
                stroke="var(--color-bodyFat)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            )}
            {visibleMetrics.includes("muscleMass") && (
              <Line
                yAxisId="kg"
                dataKey="muscleMass"
                type="monotone"
                stroke="var(--color-muscleMass)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
            )}
          </LineChart>
        </ChartContainer>
      )}
    </div>
  )
}
