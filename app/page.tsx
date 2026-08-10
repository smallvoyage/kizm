import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { MetricCard } from "@/components/metric-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="mb-8 flex items-center gap-3 sm:mb-10">
          <div className="flex size-10 items-center justify-center rounded-xl bg-foreground text-background shadow-sm">
            <Activity className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Fitness Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Body composition at a glance
            </p>
          </div>
        </header>

        {errorMessage ? (
          <Alert variant="destructive" className="bg-background p-4">
            <TriangleAlert aria-hidden="true" />
            <AlertTitle>Data could not be loaded</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : logs.length === 0 ? (
          <Alert className="bg-background p-4">
            <Database aria-hidden="true" />
            <AlertTitle>No fitness logs yet</AlertTitle>
            <AlertDescription>
              NotionのDays Data Sourceにレコードを追加すると、ここにBody
              Compositionが表示されます。
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-8">
            <section aria-labelledby="current-metrics-heading">
              <div className="mb-4">
                <h2
                  id="current-metrics-heading"
                  className="text-lg font-semibold tracking-tight"
                >
                  Current Metrics
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Latest valid value and change from the previous valid record
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <MetricCard
                  title="Weight"
                  summary={getMetricSummary(logs, "weight")}
                  unit="kg"
                  differenceUnit="kg"
                />
                <MetricCard
                  title="Body Fat"
                  summary={getMetricSummary(logs, "bodyFat")}
                  unit="%"
                  differenceUnit="pt"
                />
                <MetricCard
                  title="Muscle Mass"
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
                    Body Composition
                  </CardTitle>
                  <CardDescription>
                    Weight and muscle mass use the left axis; body fat uses the
                    right axis.
                  </CardDescription>
                </CardHeader>
                <CardContent>
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
