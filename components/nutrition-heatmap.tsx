"use client"

import { useMemo, useState } from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type FitnessLog,
  getNutritionAchievement,
  hasNutritionData,
  type NutritionAchievement,
} from "@/lib/fitness"
import type { NutritionGoals } from "@/lib/nutrition-goals"
import { cn } from "@/lib/utils"

const WEEKS_TO_SHOW = 12
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const achievementLabels: Record<NutritionAchievement, string> = {
  none: "記録なし",
  missed: "未達",
  near: "おおむね達成",
  achieved: "達成",
}

const achievementStyles: Record<NutritionAchievement, string> = {
  none: "bg-muted ring-1 ring-inset ring-border",
  missed: "bg-emerald-200 dark:bg-emerald-950",
  near: "bg-emerald-500 dark:bg-emerald-700",
  achieved: "bg-emerald-800 dark:bg-emerald-400",
}

const weekdayLabels = ["月", "火", "水", "木", "金", "土", "日"]

type HeatmapDay = {
  date: string
  isFuture: boolean
  log: FitnessLog | null
  achievement: NutritionAchievement
}

function parseDate(date: string): Date {
  return new Date(`${date}T00:00:00Z`)
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_IN_MILLISECONDS)
}

function startOfWeek(date: Date): Date {
  const mondayBasedDay = (date.getUTCDay() + 6) % 7
  return addDays(date, -mondayBasedDay)
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(parseDate(date))
}

function formatMonth(date: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "short",
    timeZone: "UTC",
  }).format(parseDate(date))
}

function formatAmount(value: number | null, unit: "kcal" | "g"): string {
  if (value === null) return "—"
  const amount = Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)
  return `${amount} ${unit}`
}

function goalStatus(
  value: number | null,
  goal: number,
  kind: "calories" | "macro"
): string {
  if (value === null) return "記録なし"
  const ratio = value / goal

  if (kind === "calories") {
    if (ratio >= 0.9 && ratio <= 1.1) return "達成"
    if (ratio < 0.9) return "目標未満"
    return "目標超過"
  }

  return ratio >= 1 ? "達成" : "目標未満"
}

function createWeeks(
  logs: FitnessLog[],
  goals: NutritionGoals,
  referenceDate: string
): HeatmapDay[][] {
  const reference = parseDate(referenceDate)
  const firstMonday = addDays(startOfWeek(reference), -(WEEKS_TO_SHOW - 1) * 7)
  const logsByDate = new Map(logs.map((log) => [log.date, log]))

  return Array.from({ length: WEEKS_TO_SHOW }, (_, weekIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = toDateString(addDays(firstMonday, weekIndex * 7 + dayIndex))
      const log = logsByDate.get(date) ?? null
      return {
        date,
        isFuture: date > referenceDate,
        log,
        achievement: getNutritionAchievement(log, goals),
      }
    })
  )
}

export function NutritionHeatmap({
  logs,
  goals,
  referenceDate,
}: {
  logs: FitnessLog[]
  goals: NutritionGoals
  referenceDate: string
}) {
  const weeks = useMemo(
    () => createWeeks(logs, goals, referenceDate),
    [logs, goals, referenceDate]
  )
  const latestRecordedDate = weeks
    .flat()
    .findLast((day) => !day.isFuture && hasNutritionData(day.log))?.date
  const [selectedDate, setSelectedDate] = useState(
    latestRecordedDate ?? referenceDate
  )
  const selectedDay =
    weeks.flat().find((day) => day.date === selectedDate) ?? null
  const selectedLog = selectedDay?.log ?? null
  const selectedAchievement = selectedDay?.achievement ?? "none"

  return (
    <Card className="gap-5 shadow-sm sm:gap-6">
      <CardHeader className="px-4 sm:px-(--card-spacing)">
        <CardTitle className="text-lg sm:text-xl">目標達成カレンダー</CardTitle>
        <CardDescription>直近12週間のカロリー・PFC目標</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-3 sm:space-y-6 sm:px-(--card-spacing)">
        <div className="mx-auto w-full max-w-2xl">
          <div className="grid grid-cols-[1rem_repeat(12,minmax(0,1fr))] gap-x-1 min-[390px]:gap-x-1.5">
            <div aria-hidden="true" />
            {weeks.map((week, index) => {
              const previousWeek = weeks[index - 1]
              const month = formatMonth(week[0].date)
              const previousMonth = previousWeek
                ? formatMonth(previousWeek[0].date)
                : null
              return (
                <div
                  key={week[0].date}
                  className="h-5 overflow-visible whitespace-nowrap text-[9px] text-muted-foreground min-[390px]:text-[10px]"
                  aria-hidden="true"
                >
                  {month !== previousMonth ? month : ""}
                </div>
              )
            })}

            <div className="grid grid-rows-7 gap-y-1 min-[390px]:gap-y-1.5">
              {weekdayLabels.map((label, index) => (
                <span
                  key={label}
                  className={cn(
                    "flex aspect-square items-center text-[9px] text-muted-foreground",
                    index % 2 === 1 && "invisible"
                  )}
                  aria-hidden="true"
                >
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((week) => (
              <div
                key={week[0].date}
                className="grid min-w-0 grid-rows-7 gap-y-1 min-[390px]:gap-y-1.5"
              >
                {week.map((day) => {
                  const isSelected = selectedDate === day.date
                  const label = `${formatDate(day.date)}、${achievementLabels[day.achievement]}`

                  return (
                    <button
                      key={day.date}
                      type="button"
                      disabled={day.isFuture}
                      aria-label={
                        day.isFuture
                          ? `${formatDate(day.date)}、未来の日付`
                          : label
                      }
                      aria-pressed={isSelected}
                      title={day.isFuture ? undefined : label}
                      onClick={() => setSelectedDate(day.date)}
                      onFocus={() => setSelectedDate(day.date)}
                      onMouseEnter={() => setSelectedDate(day.date)}
                      className={cn(
                        "aspect-square min-w-0 rounded-[3px] outline-none transition-[transform,box-shadow] focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-90",
                        day.isFuture
                          ? "cursor-default bg-transparent"
                          : achievementStyles[day.achievement],
                        isSelected &&
                          !day.isFuture &&
                          "ring-2 ring-foreground ring-offset-1"
                      )}
                    />
                  )
                })}
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-[10px] text-muted-foreground sm:text-xs">
            {(Object.keys(achievementLabels) as NutritionAchievement[]).map(
              (achievement) => (
                <span key={achievement} className="flex items-center gap-1">
                  <span
                    className={cn(
                      "size-3 rounded-[3px]",
                      achievementStyles[achievement]
                    )}
                    aria-hidden="true"
                  />
                  {achievementLabels[achievement]}
                </span>
              )
            )}
          </div>
        </div>

        <div
          className="rounded-xl border bg-muted/25 p-4"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">{formatDate(selectedDate)}</p>
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium",
                selectedAchievement === "none"
                  ? "bg-muted text-muted-foreground"
                  : "bg-emerald-100 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100"
              )}
            >
              {achievementLabels[selectedAchievement]}
            </span>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {[
              ["カロリー", formatAmount(selectedLog?.calories ?? null, "kcal")],
              [
                "P（たんぱく質）",
                formatAmount(selectedLog?.protein ?? null, "g"),
              ],
              ["F（脂質）", formatAmount(selectedLog?.fat ?? null, "g")],
              ["C（炭水化物）", formatAmount(selectedLog?.carbs ?? null, "g")],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:grid-cols-2">
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">カロリー目標</span>
              <span className="font-medium">
                {goalStatus(
                  selectedLog?.calories ?? null,
                  goals.calories,
                  "calories"
                )}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">たんぱく質目標</span>
              <span className="font-medium">
                {goalStatus(
                  selectedLog?.protein ?? null,
                  goals.protein,
                  "macro"
                )}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">脂質目標</span>
              <span className="font-medium">
                {goalStatus(selectedLog?.fat ?? null, goals.fat, "macro")}
              </span>
            </p>
            <p className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">炭水化物目標</span>
              <span className="font-medium">
                {goalStatus(selectedLog?.carbs ?? null, goals.carbs, "macro")}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
