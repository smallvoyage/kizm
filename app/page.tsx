import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { NutritionHeatmap } from "@/components/nutrition-heatmap"
import { NutritionSummary } from "@/components/nutrition-summary"
import { RefreshButton } from "@/components/refresh-button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { WeeklyReview } from "@/components/weekly-review"
import { type FitnessLog, getLatestNutritionLog } from "@/lib/fitness"
import { FitnessDataError, getFitnessLogs } from "@/lib/notion"
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
  let hasOlderLogs = false
  let errorMessage: string | null = null

  try {
    const result = await getFitnessLogs()
    logs = result.logs
    hasOlderLogs = result.hasOlderLogs
  } catch (error: unknown) {
    errorMessage =
      error instanceof FitnessDataError
        ? error.userMessage
        : "フィットネスデータを読み込めませんでした。"
  }

  const latestNutritionLog = getLatestNutritionLog(logs)
  const latestRecordDate = logs.at(-1)?.date ?? null

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

        {errorMessage ? (
          <Alert variant="destructive" className="dashboard-alert">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>データを読み込めませんでした</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : logs.length === 0 ? (
          <Alert className="dashboard-alert">
            <Database aria-hidden="true" />
            {hasOlderLogs ? (
              <>
                <AlertTitle>最近のフィットネス記録がありません</AlertTitle>
                <AlertDescription>
                  表示期間より前の記録はあります。Notion
                  に最近の記録を追加すると、ここに変化が表示されます。
                </AlertDescription>
              </>
            ) : (
              <>
                <AlertTitle>フィットネス記録がまだありません</AlertTitle>
                <AlertDescription>
                  Notion
                  に記録を追加すると、ここに食事と身体組成の変化が表示されます。
                </AlertDescription>
              </>
            )}
          </Alert>
        ) : (
          <div className="dashboard-content">
            <WeeklyReview logs={logs} />

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
