"use client"

import { CircleCheck } from "lucide-react"
import { type CSSProperties, useEffect, useState } from "react"

import type {
  BodyCompositionGoalMetric,
  BodyCompositionGoalMetricProgress,
  BodyCompositionGoalProgress as BodyCompositionGoalProgressModel,
  BodyCompositionGoalTarget,
} from "@/lib/fitness/body-composition-goal/body-composition-goal"
import { formatNumber } from "@/lib/format-number"

const metricDisplay: Record<
  BodyCompositionGoalMetric,
  { label: string; unit: "kg" | "%"; color: string; soft: string }
> = {
  weight: {
    label: "体重",
    unit: "kg",
    color: "var(--color-weight)",
    soft: "var(--color-weight-soft)",
  },
  bodyFat: {
    label: "体脂肪率",
    unit: "%",
    color: "var(--color-body-fat)",
    soft: "var(--color-body-fat-soft)",
  },
  bodyFatMass: {
    label: "体脂肪量",
    unit: "kg",
    color: "var(--color-body-fat)",
    soft: "var(--color-body-fat-soft)",
  },
  muscleMass: {
    label: "骨格筋量",
    unit: "kg",
    color: "var(--color-muscle-mass)",
    soft: "var(--color-muscle-mass-soft)",
  },
}

function formatValue(value: number) {
  return formatNumber(value, { fractionDigits: 1, fixed: true })
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatDeadline(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatTarget(target: BodyCompositionGoalTarget, unit: string) {
  switch (target.kind) {
    case "range":
      return `${formatValue(target.min)}〜${formatValue(target.max)} ${unit}`
    case "atMost":
      return `${formatValue(target.value)} ${unit} 以下`
    case "atLeast":
      return `${formatValue(target.value)} ${unit} 以上`
  }
}

function formatRemaining(remaining: number, unit: string) {
  const direction = remaining > 0 ? "増" : "減"
  return `あと ${formatValue(Math.abs(remaining))} ${unit} ${direction}`
}

function formatWeeklyChange(value: number, unit: string) {
  const formatted = formatNumber(Math.abs(value), {
    fractionDigits: 2,
    fixed: true,
  })
  return `週 ${value > 0 ? "+" : "−"}${formatted} ${unit} ペース`
}

function formatDaysRemaining(daysRemaining: number | null) {
  if (daysRemaining === null) return null
  if (daysRemaining > 0) return `あと${daysRemaining}日`
  if (daysRemaining === 0) return "今日が期限"
  return `期限から${Math.abs(daysRemaining)}日経過`
}

type MetricView = {
  progress: BodyCompositionGoalMetricProgress
  display: (typeof metricDisplay)[BodyCompositionGoalMetric]
  percent: number | null
  status: string
  dataStatus: "empty" | "achieved" | "open"
  style: CSSProperties
}

function toMetricView(progress: BodyCompositionGoalMetricProgress): MetricView {
  const display = metricDisplay[progress.metric]
  const { current, remaining, achieved, progressRatio } = progress

  return {
    progress,
    display,
    percent: progressRatio === null ? null : Math.round(progressRatio * 100),
    status:
      current === null || remaining === null
        ? "記録なし"
        : achieved
          ? "達成"
          : formatRemaining(remaining, display.unit),
    dataStatus: current === null ? "empty" : achieved ? "achieved" : "open",
    style: {
      "--metric-color": display.color,
      "--metric-soft": display.soft,
      "--goal-progress": progressRatio ?? 0,
    } as CSSProperties,
  }
}

function GoalProgressBar({ view }: { view: MetricView }) {
  return (
    <div
      className="goal-bar"
      role="progressbar"
      aria-label={`${view.display.label}の目標進捗`}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={view.percent ?? undefined}
      aria-valuetext={view.percent === null ? "記録なし" : `${view.percent}%`}
    >
      <span />
    </div>
  )
}

function GoalStatus({ view }: { view: MetricView }) {
  return (
    <p className="goal-row-status">
      {view.progress.achieved && <CircleCheck aria-hidden="true" />}
      {view.status}
    </p>
  )
}

function CurrentValue({ view }: { view: MetricView }) {
  const { current } = view.progress
  return (
    <p className="goal-row-value">
      <strong>{current === null ? "—" : formatValue(current.value)}</strong>
      <span>{current === null ? "" : view.display.unit}</span>
    </p>
  )
}

function baselineText(view: MetricView) {
  const { baseline } = view.progress
  if (baseline === null || view.percent === null) {
    return "記録が追加されると進捗を表示します"
  }
  return `${formatShortDate(baseline.date)}の${formatValue(baseline.value)} ${view.display.unit}から ${view.percent}%`
}

/* パターンA: リスト */
function ListPattern({ views }: { views: MetricView[] }) {
  return (
    <div className="goal-summary" data-goal-pattern="list">
      {views.map((view) => (
        <article
          key={view.progress.metric}
          className="goal-row"
          data-goal-metric={view.progress.metric}
          data-status={view.dataStatus}
          style={view.style}
        >
          <header className="goal-row-heading">
            <h3>{view.display.label}</h3>
            <GoalStatus view={view} />
          </header>
          <CurrentValue view={view} />
          <p className="goal-row-target">
            目標 {formatTarget(view.progress.target, view.display.unit)}
          </p>
          <GoalProgressBar view={view} />
          <p className="goal-row-meta">
            <span>{baselineText(view)}</span>
            {view.progress.requiredWeeklyChange !== null && (
              <span>
                {formatWeeklyChange(
                  view.progress.requiredWeeklyChange,
                  view.display.unit
                )}
              </span>
            )}
          </p>
        </article>
      ))}
    </div>
  )
}

/* パターンB: カード */
function CardPattern({ views }: { views: MetricView[] }) {
  return (
    <div className="goal-cards" data-goal-pattern="cards">
      {views.map((view) => (
        <article
          key={view.progress.metric}
          className="goal-card"
          data-goal-metric={view.progress.metric}
          data-status={view.dataStatus}
          style={view.style}
        >
          <h3>{view.display.label}</h3>
          <p className="goal-card-percent">
            <strong>{view.percent === null ? "—" : view.percent}</strong>
            {view.percent !== null && <span>%</span>}
          </p>
          <GoalProgressBar view={view} />
          <dl className="goal-card-values">
            <div>
              <dt>現在</dt>
              <dd>
                {view.progress.current === null
                  ? "—"
                  : `${formatValue(view.progress.current.value)} ${view.display.unit}`}
              </dd>
            </div>
            <div>
              <dt>目標</dt>
              <dd>{formatTarget(view.progress.target, view.display.unit)}</dd>
            </div>
          </dl>
          <GoalStatus view={view} />
        </article>
      ))}
    </div>
  )
}

/* パターンC: トラック（起点→現在→目標） */
function TrackPattern({ views }: { views: MetricView[] }) {
  return (
    <div className="goal-summary" data-goal-pattern="track">
      {views.map((view) => {
        const { baseline, current, target } = view.progress
        return (
          <article
            key={view.progress.metric}
            className="goal-track-row"
            data-goal-metric={view.progress.metric}
            data-status={view.dataStatus}
            style={view.style}
          >
            <header className="goal-track-heading">
              <h3>{view.display.label}</h3>
              <GoalStatus view={view} />
            </header>
            <div className="goal-track">
              <GoalProgressBar view={view} />
              {view.percent !== null && (
                <span className="goal-track-marker" aria-hidden="true" />
              )}
            </div>
            <dl className="goal-track-points">
              <div>
                <dt>
                  {baseline === null
                    ? "起点"
                    : `起点 ${formatShortDate(baseline.date)}`}
                </dt>
                <dd>{baseline === null ? "—" : formatValue(baseline.value)}</dd>
              </div>
              <div data-point="current">
                <dt>
                  {current === null
                    ? "現在"
                    : `現在 ${formatShortDate(current.date)}`}
                </dt>
                <dd>{current === null ? "—" : formatValue(current.value)}</dd>
              </div>
              <div data-point="target">
                <dt>目標</dt>
                <dd>{formatTarget(target, view.display.unit)}</dd>
              </div>
            </dl>
          </article>
        )
      })}
    </div>
  )
}

/* パターンD: ダイジェスト（全体進捗＋一覧表） */
function DigestPattern({
  views,
  progress,
}: {
  views: MetricView[]
  progress: BodyCompositionGoalProgressModel
}) {
  const overall =
    progress.overallProgressRatio === null
      ? null
      : Math.round(progress.overallProgressRatio * 100)

  return (
    <div className="goal-digest" data-goal-pattern="digest">
      <div
        className="goal-digest-overview"
        style={
          {
            "--goal-progress": progress.overallProgressRatio ?? 0,
          } as CSSProperties
        }
      >
        <div
          className="goal-ring"
          role="progressbar"
          aria-label="最終目標の全体進捗"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={overall ?? undefined}
          aria-valuetext={overall === null ? "記録なし" : `${overall}%`}
        >
          <span className="goal-ring-value">
            <strong>{overall === null ? "—" : overall}</strong>
            {overall !== null && <span>%</span>}
          </span>
        </div>
        <dl className="goal-digest-stats">
          <div>
            <dt>達成</dt>
            <dd>
              <strong>{progress.achievedCount}</strong> / {views.length}
            </dd>
          </div>
          <div>
            <dt>残り</dt>
            <dd>
              {progress.daysRemaining === null ? (
                "—"
              ) : (
                <>
                  <strong>{Math.max(progress.daysRemaining, 0)}</strong> 日
                </>
              )}
            </dd>
          </div>
        </dl>
      </div>
      <ul className="goal-digest-list">
        {views.map((view) => (
          <li
            key={view.progress.metric}
            data-goal-metric={view.progress.metric}
            data-status={view.dataStatus}
            style={view.style}
          >
            <span className="goal-digest-label">{view.display.label}</span>
            <span className="goal-digest-value">
              {view.progress.current === null
                ? "—"
                : formatValue(view.progress.current.value)}
              <small>
                {" → "}
                {formatTarget(view.progress.target, view.display.unit)}
              </small>
            </span>
            <GoalStatus view={view} />
          </li>
        ))}
      </ul>
    </div>
  )
}

const patterns = [
  { value: "list", label: "リスト" },
  { value: "cards", label: "カード" },
  { value: "track", label: "トラック" },
  { value: "digest", label: "ダイジェスト" },
] as const

type GoalPattern = (typeof patterns)[number]["value"]

const PATTERN_STORAGE_KEY = "kizm:goal-pattern"

function isGoalPattern(value: unknown): value is GoalPattern {
  return patterns.some((pattern) => pattern.value === value)
}

export function BodyCompositionGoalProgress({
  progress,
}: {
  progress: BodyCompositionGoalProgressModel
}) {
  const [pattern, setPattern] = useState<GoalPattern>("list")
  const daysRemaining = formatDaysRemaining(progress.daysRemaining)
  const views = progress.metrics.map(toMetricView)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PATTERN_STORAGE_KEY)
      if (isGoalPattern(stored)) setPattern(stored)
    } catch {
      // 保存できない環境では初期パターンのまま表示する。
    }
  }, [])

  function selectPattern(next: GoalPattern) {
    setPattern(next)
    try {
      window.localStorage.setItem(PATTERN_STORAGE_KEY, next)
    } catch {
      // 保存できなくても表示の切り替えは継続する。
    }
  }

  return (
    <section
      aria-labelledby="body-composition-goal-heading"
      className="dashboard-section dashboard-section--goal"
    >
      <header className="dashboard-section-heading">
        <div>
          <h2 id="body-composition-goal-heading">最終目標</h2>
          <p>
            <time dateTime={progress.deadline}>
              {formatDeadline(progress.deadline)}
            </time>
            まで
            {daysRemaining && (
              <>
                {" · "}
                <span className="goal-days-remaining">{daysRemaining}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <fieldset className="goal-pattern-switcher">
        <legend className="sr-only">最終目標の表示パターン</legend>
        {patterns.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={pattern === option.value}
            onClick={() => selectPattern(option.value)}
          >
            {option.label}
          </button>
        ))}
      </fieldset>

      {pattern === "list" && <ListPattern views={views} />}
      {pattern === "cards" && <CardPattern views={views} />}
      {pattern === "track" && <TrackPattern views={views} />}
      {pattern === "digest" && (
        <DigestPattern views={views} progress={progress} />
      )}
    </section>
  )
}
