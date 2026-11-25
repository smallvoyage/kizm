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
  { label: string; unit: "kg" | "%"; color: string }
> = {
  weight: {
    label: "体重",
    unit: "kg",
    color: "var(--color-weight)",
  },
  bodyFat: {
    label: "体脂肪率",
    unit: "%",
    color: "var(--color-body-fat)",
  },
  bodyFatMass: {
    label: "体脂肪量",
    unit: "kg",
    color: "var(--color-body-fat)",
  },
  muscleMass: {
    label: "骨格筋量",
    unit: "kg",
    color: "var(--color-muscle-mass)",
  },
}

function formatValue(value: number) {
  return formatNumber(value, { fractionDigits: 1, fixed: true })
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

function GoalCard({
  progress,
}: {
  progress: BodyCompositionGoalMetricProgress
}) {
  const display = metricDisplay[progress.metric]
  const { current, remaining, achieved, target } = progress
  const status =
    current === null || remaining === null
      ? "記録なし"
      : achieved
        ? "達成"
        : formatRemaining(remaining, display.unit)

  return (
    <article
      className="goal-card"
      data-goal-metric={progress.metric}
      data-status={current === null ? "empty" : achieved ? "achieved" : "open"}
      style={{ "--metric-color": display.color } as CSSProperties}
    >
      <h3>{display.label}</h3>
      <p className="goal-card-value">
        <strong>{current === null ? "—" : formatValue(current.value)}</strong>
        {current !== null && <span>{display.unit}</span>}
      </p>
      <p className="goal-card-target">
        目標 {formatTarget(target, display.unit)}
      </p>
      <p className="goal-card-status">
        {achieved && <CircleCheck aria-hidden="true" />}
        {status}
      </p>
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
          <GoalCard key={metric.metric} progress={metric} />
        ))}
      </div>
    </section>
  )
}
