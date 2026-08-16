"use client"

import { ChevronDown, Minus, TrendingDown, TrendingUp } from "lucide-react"
import { useMemo, useState } from "react"
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { type ChartConfig, ChartContainer } from "@/components/ui/chart"
import {
  compareWorkoutPerformance,
  getExerciseGroups,
  getRepresentativeWorkoutSets,
  type PerformanceTrend,
  type RepresentativeWorkoutSet,
  type WorkoutSet,
} from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"

const chartConfig = {
  weightKg: { label: "重量", color: "var(--color-weight)" },
} satisfies ChartConfig

const TREND_CONTENT: Record<
  PerformanceTrend,
  { label: string; icon: typeof TrendingUp }
> = {
  growth: { label: "前回より成長", icon: TrendingUp },
  maintained: { label: "前回と同等", icon: Minus },
  lower: { label: "前回より控えめ", icon: TrendingDown },
}

function formatAxisDate(date: string) {
  const [, month, day] = date.split("-")
  return `${Number(month)}/${Number(day)}`
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatSet(set: RepresentativeWorkoutSet) {
  return `${formatNumber(set.weightKg, { fractionDigits: 1 })} kg × ${formatNumber(set.reps)} 回`
}

type TrainingProgressProps = {
  workoutSets: WorkoutSet[]
}

export function TrainingProgress({ workoutSets }: TrainingProgressProps) {
  const exerciseGroups = useMemo(
    () => getExerciseGroups(workoutSets),
    [workoutSets]
  )
  const exerciseNames = useMemo(
    () => exerciseGroups.flatMap((group) => group.exercises),
    [exerciseGroups]
  )
  const [selectedExercise, setSelectedExercise] = useState(
    () => exerciseNames[0] ?? ""
  )
  // router.refresh() 後も選択状態は残るため、選択中の種目が消えた場合は先頭へ戻す。
  const activeExercise = exerciseNames.includes(selectedExercise)
    ? selectedExercise
    : (exerciseNames[0] ?? "")
  const representativeSets = useMemo(
    () => getRepresentativeWorkoutSets(workoutSets, activeExercise),
    [activeExercise, workoutSets]
  )
  const latestSet = representativeSets.at(-1) ?? null
  const previousSet = representativeSets.at(-2) ?? null
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const selectedSet =
    representativeSets.find((set) => set.date === selectedDate) ?? latestSet

  if (exerciseNames.length === 0) {
    return (
      <div className="training-empty">
        <p>重量と回数が入力されたトレーニング記録はまだありません。</p>
      </div>
    )
  }

  const trend =
    latestSet && previousSet
      ? compareWorkoutPerformance(latestSet, previousSet)
      : null
  const trendContent = trend ? TREND_CONTENT[trend] : null
  const TrendIcon = trendContent?.icon ?? Minus

  return (
    <div className="training-progress">
      <label className="training-exercise-field">
        <span>種目</span>
        <span className="training-select-wrap">
          <select
            value={activeExercise}
            onChange={(event) => {
              setSelectedExercise(event.target.value)
              setSelectedDate(null)
            }}
          >
            {exerciseGroups.map((group) => (
              <optgroup key={group.category} label={group.category}>
                {group.exercises.map((exercise) => (
                  <option key={exercise} value={exercise}>
                    {exercise}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <ChevronDown aria-hidden="true" />
        </span>
      </label>

      {latestSet && (
        <div className="training-summary" aria-live="polite">
          <div className="training-latest">
            <p>最新 · {formatDate(latestSet.date)}</p>
            <strong>{formatSet(latestSet)}</strong>
          </div>
          <div className="training-comparison">
            <span className="training-trend" data-trend={trend ?? "initial"}>
              <TrendIcon aria-hidden="true" />
              {trendContent?.label ?? "比較できる次の記録を待っています"}
            </span>
            {previousSet && <span>前回 · {formatSet(previousSet)}</span>}
          </div>
        </div>
      )}

      <div className="training-chart-panel">
        <div className="training-chart-meta">
          <div>
            <p>重量の推移</p>
            <span>点をタップすると回数を確認できます</span>
          </div>
          {selectedSet && (
            <div className="training-selected-set">
              <time dateTime={selectedSet.date}>
                {formatDate(selectedSet.date)}
              </time>
              <strong>{formatSet(selectedSet)}</strong>
            </div>
          )}
        </div>

        <ChartContainer
          config={chartConfig}
          initialDimension={{ width: 240, height: 236 }}
          className="training-chart [&_.recharts-responsive-container]:flex-1"
        >
          <LineChart
            accessibilityLayer
            data={representativeSets}
            margin={{ top: 16, right: 12, bottom: 4, left: 0 }}
            onClick={({ activeLabel }) => {
              if (typeof activeLabel === "string") setSelectedDate(activeLabel)
            }}
          >
            <CartesianGrid vertical={false} stroke="var(--color-rule)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              minTickGap={28}
              tickFormatter={formatAxisDate}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              width={38}
              domain={[
                (dataMin: number) => Math.max(0, dataMin - 2.5),
                (dataMax: number) => dataMax + 2.5,
              ]}
              tickFormatter={(value: number) =>
                formatNumber(value, { fractionDigits: 1 })
              }
            />
            <Line
              dataKey="weightKg"
              name="重量"
              type="monotone"
              isAnimationActive={false}
              stroke="var(--color-weight)"
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: "var(--color-weight)",
                stroke: "var(--color-paper-2)",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 6,
                fill: "var(--color-weight)",
                stroke: "var(--color-paper-2)",
                strokeWidth: 3,
              }}
            />
          </LineChart>
        </ChartContainer>

        <ul className="sr-only">
          {representativeSets.map((set) => (
            <li key={set.date}>
              {formatDate(set.date)}: {formatSet(set)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
