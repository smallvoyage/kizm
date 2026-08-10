"use client"

import { type ComponentProps, type ReactNode, useMemo, useState } from "react"
import { Bar, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"

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
  type ChartPeriod,
  type FitnessLog,
  filterLogsByPeriod,
} from "@/lib/fitness"

const chartConfig = {
  calories: { label: "カロリー", color: "var(--chart-1)" },
  protein: { label: "たんぱく質", color: "var(--chart-2)" },
  fat: { label: "脂質", color: "var(--chart-3)" },
  carbs: { label: "炭水化物", color: "var(--chart-4)" },
} satisfies ChartConfig

const periodOptions: ChartPeriod[] = ["7D", "30D", "90D", "ALL"]
const periodLabels: Record<ChartPeriod, string> = {
  "7D": "7日",
  "30D": "30日",
  "90D": "90日",
  ALL: "全期間",
}

const tooltipOrder = ["calories", "protein", "fat", "carbs"]

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

function NutritionTooltipContent(
  props: ComponentProps<typeof ChartTooltipContent>
) {
  const payload = props.payload?.toSorted(
    (a, b) =>
      tooltipOrder.indexOf(String(a.dataKey)) -
      tooltipOrder.indexOf(String(b.dataKey))
  )

  return (
    <ChartTooltipContent
      {...props}
      payload={payload}
      labelFormatter={formatTooltipDate}
      formatter={(value, name, item) => (
        <div className="flex flex-1 items-center justify-between gap-6">
          <span className="flex items-center gap-2 text-muted-foreground">
            <span
              className="h-3 w-1 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {typeof value === "number" ? value.toFixed(1) : value}
            {name === "calories" ? " kcal" : " g"}
          </span>
        </div>
      )}
    />
  )
}

export function NutritionChart({
  logs,
  referenceDate,
}: {
  logs: FitnessLog[]
  referenceDate: string
}) {
  const [period, setPeriod] = useState<ChartPeriod>("30D")
  const filteredLogs = useMemo(
    () => filterLogsByPeriod(logs, period, referenceDate),
    [logs, period, referenceDate]
  )
  const hasNutritionData = filteredLogs.some((log) =>
    (["calories", "protein", "fat", "carbs"] as const).some(
      (metric) => log[metric] !== null
    )
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-2 px-2 sm:px-0">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          期間
        </p>
        <ToggleGroup
          aria-label="栄養グラフの表示期間"
          value={[period]}
          onValueChange={(values) => {
            const nextPeriod = values.at(-1) as ChartPeriod | undefined
            if (nextPeriod) setPeriod(nextPeriod)
          }}
          variant="outline"
          spacing={0}
          className="grid w-full grid-cols-4 sm:w-fit"
        >
          {periodOptions.map((option) => (
            <ToggleGroupItem
              key={option}
              value={option}
              aria-label={periodLabels[option]}
              className="h-11 min-w-0 px-2 sm:h-8"
            >
              {periodLabels[option]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {!hasNutritionData ? (
        <div className="flex min-h-80 items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 text-center">
          <p className="font-medium">この期間の食事データはありません</p>
        </div>
      ) : (
        <ChartContainer
          config={chartConfig}
          className="h-[360px] w-full sm:h-[440px]"
        >
          <ComposedChart
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
              yAxisId="grams"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={34}
              unit=" g"
            />
            <YAxis
              yAxisId="calories"
              orientation="right"
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={46}
              unit=" kcal"
            />
            <ChartTooltip content={<NutritionTooltipContent />} />
            <ChartLegend
              content={
                <ChartLegendContent className="gap-2 text-[10px] sm:gap-4 sm:text-xs" />
              }
            />
            <Bar
              yAxisId="grams"
              dataKey="protein"
              stackId="macros"
              fill="var(--color-protein)"
            />
            <Bar
              yAxisId="grams"
              dataKey="fat"
              stackId="macros"
              fill="var(--color-fat)"
            />
            <Bar
              yAxisId="grams"
              dataKey="carbs"
              stackId="macros"
              fill="var(--color-carbs)"
              radius={[3, 3, 0, 0]}
            />
            <Line
              yAxisId="calories"
              dataKey="calories"
              type="monotone"
              stroke="var(--color-calories)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ChartContainer>
      )}
    </div>
  )
}
