import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { NutritionSummary } from "@/components/nutrition-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { type FitnessLog, getLatestNutritionLog } from "@/lib/fitness"
import { FitnessDataError, getFitnessLogs } from "@/lib/notion"
import { NUTRITION_GOALS } from "@/lib/nutrition-goals"

export default async function Home() {
  await connection()

  let logs: FitnessLog[] = []
  let errorMessage: string | null = null

  try {
    logs = await getFitnessLogs()
  } catch (error: unknown) {
    errorMessage =
      error instanceof FitnessDataError
        ? error.userMessage
        : "フィットネスデータを読み込めませんでした。"
  }

  const latestNutritionLog = getLatestNutritionLog(logs)

  return (
    <main className="fitness-shell">
      <div className="dashboard-frame">
        <header className="dashboard-header">
          <div className="dashboard-wordmark">
            <span className="dashboard-mark" aria-hidden="true">
              <Activity />
            </span>
            <span>フィットネス分析</span>
          </div>
          <div className="dashboard-source">
            <Database aria-hidden="true" />
            <span>Notion</span>
          </div>
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
            <AlertTitle>フィットネス記録がまだありません</AlertTitle>
            <AlertDescription>
              Notion
              に記録を追加すると、ここに食事と身体組成の変化が表示されます。
            </AlertDescription>
          </Alert>
        ) : (
          <div className="dashboard-workbench">
            <div className="dashboard-intro">
              <h1>今の状態と、これまでの変化。</h1>
              <p>最新の食事記録と身体組成を、同じ時間軸で確認できます。</p>
            </div>

            <section
              aria-labelledby="nutrition-heading"
              className="dashboard-section"
            >
              <header className="dashboard-section-heading">
                <div>
                  <h2 id="nutrition-heading">食事状況</h2>
                  <p>目標に対する最新記録</p>
                </div>
                <p className="dashboard-section-date">
                  {latestNutritionLog?.date ?? "記録日なし"}
                </p>
              </header>
              <NutritionSummary
                log={latestNutritionLog}
                goals={NUTRITION_GOALS}
              />
            </section>

            <section
              aria-labelledby="body-composition-heading"
              className="dashboard-section dashboard-section--chart"
            >
              <header className="dashboard-section-heading">
                <div>
                  <h2 id="body-composition-heading">身体組成の推移</h2>
                  <p>指標を選んで、記録日ごとの変化を確認</p>
                </div>
              </header>
              <BodyCompositionChart logs={logs} />
            </section>
          </div>
        )}

        <footer className="dashboard-footer">
          <p>個人の記録 · Notion から取得</p>
        </footer>
      </div>
    </main>
  )
}
