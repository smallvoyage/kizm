import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { NutritionHeatmap } from "@/components/nutrition-heatmap"
import { NutritionSummary } from "@/components/nutrition-summary"
import { RefreshButton } from "@/components/refresh-button"
import { TrainingProgress } from "@/components/training-progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WeeklyReview } from "@/components/weekly-review"
import {
  type FitnessLog,
  getLatestNutritionLog,
  type WorkoutSet,
} from "@/lib/fitness"
import { FitnessDataError, getFitnessLogs, getWorkoutSets } from "@/lib/notion"
import { NUTRITION_GOALS } from "@/lib/nutrition-goals"

function formatRecordDate(date: string | null | undefined) {
  if (!date) return "記録日なし"

  return new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

export default async function Home() {
  await connection()

  const referenceDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date())

  let logs: FitnessLog[] = []
  let workoutSets: WorkoutSet[] = []
  let errorMessage: string | null = null
  let workoutErrorMessage: string | null = null

  const [fitnessResult, workoutResult] = await Promise.allSettled([
    getFitnessLogs(),
    getWorkoutSets(),
  ])

  if (fitnessResult.status === "fulfilled") {
    logs = fitnessResult.value
  } else {
    const error = fitnessResult.reason
    errorMessage =
      error instanceof FitnessDataError
        ? error.userMessage
        : "フィットネスデータを読み込めませんでした。"
  }

  if (workoutResult.status === "fulfilled") {
    workoutSets = workoutResult.value
  } else {
    const error = workoutResult.reason
    workoutErrorMessage =
      error instanceof FitnessDataError
        ? error.userMessage
        : "トレーニングデータを読み込めませんでした。"
  }

  const latestNutritionLog = getLatestNutritionLog(logs)
  const latestRecordDate = logs.at(-1)?.date ?? null
  const hasSourceError = Boolean(errorMessage || workoutErrorMessage)
  const hasNoRecords = logs.length === 0 && workoutSets.length === 0
  const shouldShowEmptyState = !hasSourceError && hasNoRecords

  return (
    <main className="fitness-shell">
      <div className="dashboard-frame">
        <header className="dashboard-header">
          <h1 className="dashboard-wordmark">
            <span className="dashboard-mark" aria-hidden="true">
              <Activity />
            </span>
            <span>フィットネス</span>
          </h1>
          <RefreshButton />
        </header>

        {errorMessage && workoutErrorMessage ? (
          <Alert variant="destructive" className="dashboard-alert">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>データを読み込めませんでした</AlertTitle>
            <AlertDescription>
              {errorMessage} {workoutErrorMessage}
            </AlertDescription>
          </Alert>
        ) : shouldShowEmptyState ? (
          <Alert className="dashboard-alert">
            <Database aria-hidden="true" />
            <AlertTitle>フィットネス記録がまだありません</AlertTitle>
            <AlertDescription>
              Notionに記録を追加すると、ここにトレーニング、食事、身体組成の変化が表示されます。
            </AlertDescription>
          </Alert>
        ) : (
          <div className="dashboard-content">
            {errorMessage && (
              <Alert variant="destructive" className="dashboard-alert">
                <TriangleAlert aria-hidden="true" />
                <AlertTitle>日次データを読み込めませんでした</AlertTitle>
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            {logs.length > 0 && <WeeklyReview logs={logs} />}

            {logs.length > 0 && (
              <section
                aria-labelledby="nutrition-heading"
                className="dashboard-section dashboard-section--nutrition"
              >
                <header className="dashboard-section-heading">
                  <div>
                    <h2 id="nutrition-heading">食事状況</h2>
                    <p>1日の目標に対する最新記録</p>
                  </div>
                  <time
                    className="dashboard-section-date"
                    dateTime={latestNutritionLog?.date}
                  >
                    {formatRecordDate(latestNutritionLog?.date)}
                  </time>
                </header>
                <NutritionSummary
                  log={latestNutritionLog}
                  goals={NUTRITION_GOALS}
                />
                <NutritionHeatmap
                  logs={logs}
                  goals={NUTRITION_GOALS}
                  referenceDate={referenceDate}
                />
              </section>
            )}

            {logs.length > 0 && (
              <section
                aria-labelledby="body-composition-heading"
                className="dashboard-section dashboard-section--chart"
              >
                <header className="dashboard-section-heading">
                  <div>
                    <h2 id="body-composition-heading">身体組成</h2>
                    <p>指標を選んで、記録ごとの変化を確認</p>
                  </div>
                </header>
                <BodyCompositionChart logs={logs} />
              </section>
            )}

            <section
              aria-labelledby="training-heading"
              className="dashboard-section dashboard-section--training"
            >
              <header className="dashboard-section-heading">
                <div>
                  <h2 id="training-heading">トレーニング</h2>
                  <p>種目ごとの重量と回数の伸び</p>
                </div>
              </header>
              {workoutErrorMessage ? (
                <Alert variant="destructive" className="training-alert">
                  <TriangleAlert aria-hidden="true" />
                  <AlertTitle>トレーニングを読み込めませんでした</AlertTitle>
                  <AlertDescription>{workoutErrorMessage}</AlertDescription>
                </Alert>
              ) : (
                <TrainingProgress workoutSets={workoutSets} />
              )}
            </section>
          </div>
        )}

        <footer className="dashboard-footer">
          <p>Notionから取得</p>
          {latestRecordDate && (
            <time dateTime={latestRecordDate}>
              最終記録 {formatRecordDate(latestRecordDate)}
            </time>
          )}
        </footer>
      </div>
    </main>
  )
}
