import { parseCalendarDate } from "@/lib/calendar-date"
import type { FitnessLog } from "@/lib/fitness/fitness"

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export type BodyCompositionGoalMetric =
  | "weight"
  | "bodyFat"
  | "bodyFatMass"
  | "muscleMass"

/**
 * 目標値の判定方法。
 * - `range`: min以上max以下で達成
 * - `atMost`: value以下で達成
 * - `atLeast`: value以上で達成
 */
export type BodyCompositionGoalTarget =
  | { kind: "range"; min: number; max: number }
  | { kind: "atMost"; value: number }
  | { kind: "atLeast"; value: number }

export type BodyCompositionGoals = {
  /** 目標期限（YYYY-MM-DD）。 */
  deadline: string
  targets: Record<BodyCompositionGoalMetric, BodyCompositionGoalTarget>
}

type DatedValue = {
  date: string
  value: number
}

export type BodyCompositionGoalMetricProgress = {
  metric: BodyCompositionGoalMetric
  target: BodyCompositionGoalTarget
  /** 表示期間内で最も古い記録。進捗率の起点に使う。 */
  baseline: DatedValue | null
  /** 最新の記録。 */
  current: DatedValue | null
  /** 目標達成に必要な変化量。増やす必要があれば正、減らす必要があれば負、達成済みは0。 */
  remaining: number | null
  achieved: boolean
  /** 起点から目標までの進み具合（0〜1）。判定できない場合はnull。 */
  progressRatio: number | null
  /** 期限までに必要な1週間あたりの変化量。期限切れ・達成済み・未記録はnull。 */
  requiredWeeklyChange: number | null
}

export type BodyCompositionGoalProgress = {
  deadline: string
  /** 基準日から期限までの日数。期限当日は0、期限超過は負。基準日が不正ならnull。 */
  daysRemaining: number | null
  metrics: BodyCompositionGoalMetricProgress[]
}

const BODY_COMPOSITION_GOAL_METRICS: BodyCompositionGoalMetric[] = [
  "weight",
  "bodyFat",
  "bodyFatMass",
  "muscleMass",
]

/** 体重（kg）と体脂肪率（%）から体脂肪量（kg）を求める。 */
export function calculateBodyFatMass(
  weight: number | null,
  bodyFat: number | null
): number | null {
  if (weight === null || bodyFat === null) return null
  return (weight * bodyFat) / 100
}

function metricValue(
  log: FitnessLog,
  metric: BodyCompositionGoalMetric
): number | null {
  if (metric === "bodyFatMass") {
    return calculateBodyFatMass(log.weight, log.bodyFat)
  }
  return log[metric]
}

/** 目標を満たすために必要な変化量（符号付き）。達成済みなら0。 */
export function getGoalGap(
  value: number,
  target: BodyCompositionGoalTarget
): number {
  switch (target.kind) {
    case "range":
      if (value < target.min) return target.min - value
      if (value > target.max) return target.max - value
      return 0
    case "atMost":
      return value > target.value ? target.value - value : 0
    case "atLeast":
      return value < target.value ? target.value - value : 0
  }
}

function daysBetween(from: string, to: string): number | null {
  const fromDate = parseCalendarDate(from)
  const toDate = parseCalendarDate(to)
  if (!fromDate || !toDate) return null
  return Math.round(
    (toDate.getTime() - fromDate.getTime()) / DAY_IN_MILLISECONDS
  )
}

function clampRatio(value: number): number {
  return Math.min(Math.max(value, 0), 1)
}

function getMetricProgress(
  logs: FitnessLog[],
  metric: BodyCompositionGoalMetric,
  target: BodyCompositionGoalTarget,
  daysRemaining: number | null
): BodyCompositionGoalMetricProgress {
  const recorded = logs
    .map((log) => ({ date: log.date, value: metricValue(log, metric) }))
    .filter((entry): entry is DatedValue => entry.value !== null)
    .toSorted((a, b) => a.date.localeCompare(b.date))

  const baseline = recorded.at(0) ?? null
  const current = recorded.at(-1) ?? null

  if (!current || !baseline) {
    return {
      metric,
      target,
      baseline: null,
      current: null,
      remaining: null,
      achieved: false,
      progressRatio: null,
      requiredWeeklyChange: null,
    }
  }

  const remaining = getGoalGap(current.value, target)
  const achieved = remaining === 0
  const baselineGap = getGoalGap(baseline.value, target)

  let progressRatio: number
  if (achieved) {
    progressRatio = 1
  } else if (
    baselineGap === 0 ||
    Math.sign(baselineGap) !== Math.sign(remaining)
  ) {
    // 起点では達成していた、または目標を挟んで反対側にいた場合は起点からの進捗を測れない。
    progressRatio = 0
  } else {
    progressRatio = clampRatio(1 - remaining / baselineGap)
  }

  const requiredWeeklyChange =
    !achieved && daysRemaining !== null && daysRemaining > 0
      ? (remaining / daysRemaining) * 7
      : null

  return {
    metric,
    target,
    baseline,
    current,
    remaining,
    achieved,
    progressRatio,
    requiredWeeklyChange,
  }
}

export function getBodyCompositionGoalProgress(
  logs: FitnessLog[],
  goals: BodyCompositionGoals,
  referenceDate: string
): BodyCompositionGoalProgress {
  const daysRemaining = daysBetween(referenceDate, goals.deadline)

  return {
    deadline: goals.deadline,
    daysRemaining,
    metrics: BODY_COMPOSITION_GOAL_METRICS.map((metric) =>
      getMetricProgress(logs, metric, goals.targets[metric], daysRemaining)
    ),
  }
}
