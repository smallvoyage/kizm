import { CircleCheck } from "lucide-react"
import type { CSSProperties } from "react"

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

function GoalCard({ view }: { view: MetricView }) {
  const { current, baseline, target, achieved } = view.progress

  return (
    <article
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
      <dl className="goal-card-values">
        <div>
          <dt>現在</dt>
          <dd>
            {current === null
              ? "—"
              : `${formatValue(current.value)} ${view.display.unit}`}
          </dd>
        </div>
        <div>
          <dt>目標</dt>
          <dd>{formatTarget(target, view.display.unit)}</dd>
        </div>
      </dl>
      <p className="goal-card-status">
        {achieved && <CircleCheck aria-hidden="true" />}
        {view.status}
      </p>
      {baseline !== null && (
        <p className="goal-card-baseline">
          起点 {formatShortDate(baseline.date)} {formatValue(baseline.value)}{" "}
          {view.display.unit}
        </p>
      )}
    </article>
  )
}

export function BodyCompositionGoalProgress({
  progress,
}: {
  progress: BodyCompositionGoalProgressModel
}) {
  const daysRemaining = formatDaysRemaining(progress.daysRemaining)

  return (
    <section
      aria-labelledby="body-composition-goal-heading"
      className="dashboard-section dashboard-section--goal"
    >
      <header className="dashboard-section-heading">
        <div>
          <h2 id="body-composition-goal-heading">目標</h2>
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
      <div className="goal-cards">
        {progress.metrics.map((metric) => (
          <GoalCard key={metric.metric} view={toMetricView(metric)} />
        ))}
      </div>
    </section>
  )
}
