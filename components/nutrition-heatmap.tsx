"use client"

import { useMemo, useState } from "react"

import {
  type FitnessLog,
  getNutritionAchievement,
  hasNutritionData,
  type NutritionAchievement,
  type NutritionMetric,
} from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"
import type { NutritionGoals } from "@/lib/nutrition-goals"
import { cn } from "@/lib/utils"

const WEEKS_TO_SHOW = 12
const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

const achievementLabels: Record<NutritionAchievement, string> = {
  none: "記録なし",
  missed: "未達",
  partial: "一部達成",
  near: "おおむね達成",
  achieved: "達成",
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
  return `${formatNumber(value)} ${unit}`
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
  const visibleDays = weeks.flat().filter((day) => !day.isFuture)
  const achievementSummary = visibleDays.reduce(
    (summary, day) => {
      summary[day.achievement] += 1
      return summary
    },
    { none: 0, missed: 0, partial: 0, near: 0, achieved: 0 }
  )
  const selectedNutrition: Array<{
    metric: NutritionMetric
    label: string
    goalLabel: string
    value: string
    status: string
  }> = [
    {
      metric: "calories",
      label: "カロリー",
      goalLabel: "カロリー目標",
      value: formatAmount(selectedLog?.calories ?? null, "kcal"),
      status: goalStatus(
        selectedLog?.calories ?? null,
        goals.calories,
        "calories"
      ),
    },
    {
      metric: "protein",
      label: "たんぱく質",
      goalLabel: "たんぱく質目標",
      value: formatAmount(selectedLog?.protein ?? null, "g"),
      status: goalStatus(selectedLog?.protein ?? null, goals.protein, "macro"),
    },
    {
      metric: "fat",
      label: "脂質",
      goalLabel: "脂質目標",
      value: formatAmount(selectedLog?.fat ?? null, "g"),
      status: goalStatus(selectedLog?.fat ?? null, goals.fat, "macro"),
    },
    {
      metric: "carbs",
      label: "炭水化物",
      goalLabel: "炭水化物目標",
      value: formatAmount(selectedLog?.carbs ?? null, "g"),
      status: goalStatus(selectedLog?.carbs ?? null, goals.carbs, "macro"),
    },
  ]

  return (
    <section
      className="nutrition-history"
      aria-labelledby="history-heading"
      aria-describedby="heatmap-summary"
    >
      <header className="nutrition-history-heading">
        <div>
          <h3 id="history-heading">12週間の達成状況</h3>
          <p>カロリーとPFCを日ごとに判定</p>
        </div>
        <span className="nutrition-history-period">直近84日</span>
      </header>

      <div className="nutrition-heatmap">
        <div className="nutrition-heatmap-grid">
          <div className="nutrition-heatmap-months" aria-hidden="true">
            <div aria-hidden="true" />
            {weeks.map((week, index) => {
              const previousWeek = weeks[index - 1]
              const month = formatMonth(week[0].date)
              const previousMonth = previousWeek
                ? formatMonth(previousWeek[0].date)
                : null
              return (
                <span key={week[0].date}>
                  {month !== previousMonth ? month : ""}
                </span>
              )
            })}
          </div>

          <div className="nutrition-heatmap-body">
            <div className="nutrition-heatmap-weekdays" aria-hidden="true">
              {weekdayLabels.map((label, index) => (
                <span
                  key={label}
                  className={cn(index % 2 === 1 && "is-hidden")}
                >
                  {label}
                </span>
              ))}
            </div>

            {weeks.map((week) => (
              <div key={week[0].date} className="nutrition-heatmap-week">
                {week.map((day) => {
                  const isSelected = selectedDate === day.date

                  return (
                    <button
                      key={day.date}
                      type="button"
                      className="nutrition-heatmap-cell"
                      disabled={day.isFuture}
                      aria-label={
                        day.isFuture
                          ? `${formatDate(day.date)}、未来の日付`
                          : `${formatDate(day.date)}、${achievementLabels[day.achievement]}`
                      }
                      aria-pressed={isSelected}
                      data-achievement={day.achievement}
                      data-future={day.isFuture ? "true" : undefined}
                      data-selected={
                        isSelected && !day.isFuture ? "true" : undefined
                      }
                      title={
                        day.isFuture
                          ? undefined
                          : `${formatDate(day.date)}、${achievementLabels[day.achievement]}`
                      }
                      onClick={() => setSelectedDate(day.date)}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <p id="heatmap-summary" className="sr-only">
          達成 {achievementSummary.achieved}日、おおむね達成
          {achievementSummary.near}日、一部達成
          {achievementSummary.partial}日、未達 {achievementSummary.missed}
          日、記録なし
          {achievementSummary.none}日です。
        </p>

        <ul className="nutrition-heatmap-legend" aria-label="達成度の凡例">
          {(Object.keys(achievementLabels) as NutritionAchievement[]).map(
            (achievement) => (
              <li key={achievement}>
                <i data-achievement={achievement} aria-hidden="true" />
                {achievementLabels[achievement]}
              </li>
            )
          )}
        </ul>
      </div>

      <article
        className="nutrition-day-detail"
        aria-live="polite"
        aria-atomic="true"
      >
        <header className="nutrition-day-detail-heading">
          <div>
            <p>選択した記録</p>
            <h4>{formatDate(selectedDate)}</h4>
          </div>
          <span
            className="nutrition-achievement"
            data-achievement={selectedAchievement}
          >
            <i aria-hidden="true" />
            {achievementLabels[selectedAchievement]}
          </span>
        </header>

        <dl className="nutrition-day-values">
          {selectedNutrition.map((item) => (
            <div key={item.metric} data-nutrition-metric={item.metric}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>

        <dl className="nutrition-goal-status">
          {selectedNutrition.map((item) => (
            <div key={item.metric} data-nutrition-metric={item.metric}>
              <dt>{item.goalLabel}</dt>
              <dd>{item.status}</dd>
            </div>
          ))}
        </dl>
      </article>
    </section>
  )
}
