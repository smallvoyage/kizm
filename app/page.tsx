import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { MetricCard } from "@/components/metric-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type FitnessLog, getMetricSummary } from "@/lib/fitness"
import { FitnessDataError, getFitnessLogs } from "@/lib/notion"

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
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-6 flex items-center gap-3 sm:mb-10">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm sm:size-10">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-3xl">
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
          <div className="space-y-6 sm:space-y-8">
            <section aria-labelledby="current-metrics-heading">
              <h2
                id="current-metrics-heading"
                className="mb-3 text-base font-semibold tracking-tight sm:mb-4 sm:text-lg"
              >
                最新の測定値
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
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
              <Card className="gap-4 shadow-sm sm:gap-6">
                <CardHeader className="px-4 sm:px-(--card-spacing)">
                  <CardTitle id="body-composition-heading" className="text-lg">
                    身体組成
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-(--card-spacing)">
                  <BodyCompositionChart logs={logs} referenceDate={today()} />
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
