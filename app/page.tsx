import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { MetricCard } from "@/components/metric-card"
import { NutritionChart } from "@/components/nutrition-chart"
import { NutritionSummary } from "@/components/nutrition-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  type FitnessLog,
  getLatestNutritionLog,
  getMetricSummary,
} from "@/lib/fitness"
import { FitnessDataError, getFitnessLogs } from "@/lib/notion"
import { getNutritionGoals } from "@/lib/nutrition-goals"

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

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

  return (
    <main className="min-h-screen bg-muted/30">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 flex items-center gap-3 sm:mb-10">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            フィットネス分析
          </h1>
        </header>

        {errorMessage ? (
          <Alert variant="destructive" className="bg-background p-4">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>データを読み込めませんでした</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : logs.length === 0 ? (
          <Alert className="bg-background p-4">
            <Database aria-hidden="true" />
            <AlertTitle>フィットネス記録がまだありません</AlertTitle>
          </Alert>
        ) : (
          <div className="space-y-8">
            <section aria-labelledby="current-metrics-heading">
              <h2
                id="current-metrics-heading"
                className="mb-4 text-lg font-semibold tracking-tight"
              >
                現在の測定値
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="体重"
                  summary={getMetricSummary(logs, "weight")}
                  unit="kg"
                  differenceUnit="kg"
                />
                <MetricCard
                  title="体脂肪率"
                  summary={getMetricSummary(logs, "bodyFat")}
                  unit="%"
                  differenceUnit="pt"
                />
                <MetricCard
                  title="筋肉量"
                  summary={getMetricSummary(logs, "muscleMass")}
                  unit="kg"
                  differenceUnit="kg"
                />
              </div>
            </section>

            <section aria-labelledby="body-composition-heading">
              <Card className="gap-6 shadow-sm">
                <CardHeader>
                  <CardTitle id="body-composition-heading" className="text-lg">
                    身体組成
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BodyCompositionChart logs={logs} referenceDate={today()} />
                </CardContent>
              </Card>
            </section>

            <section aria-labelledby="nutrition-heading" className="space-y-4">
              <h2
                id="nutrition-heading"
                className="text-lg font-semibold tracking-tight"
              >
                食事状況
              </h2>
              <NutritionSummary
                log={getLatestNutritionLog(logs)}
                goals={getNutritionGoals()}
              />
              <Card className="gap-6 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">栄養バランスの推移</CardTitle>
                </CardHeader>
                <CardContent>
                  <NutritionChart logs={logs} referenceDate={today()} />
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
