import { Activity, Database, TriangleAlert } from "lucide-react"
import { connection } from "next/server"

import { BodyCompositionChart } from "@/components/body-composition-chart"
import { NutritionHeatmap } from "@/components/nutrition-heatmap"
import { NutritionSummary } from "@/components/nutrition-summary"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type FitnessLog, getLatestNutritionLog } from "@/lib/fitness"
import { FitnessDataError, getFitnessLogs } from "@/lib/notion"
import { NUTRITION_GOALS } from "@/lib/nutrition-goals"

export default async function Home() {
  await connection()

  const referenceDate = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(new Date())

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
            <section aria-labelledby="nutrition-heading" className="space-y-4">
              <h2
                id="nutrition-heading"
                className="text-lg font-semibold tracking-tight"
              >
                食事状況
              </h2>
              <NutritionSummary
                log={getLatestNutritionLog(logs)}
                goals={NUTRITION_GOALS}
              />
              <NutritionHeatmap
                logs={logs}
                goals={NUTRITION_GOALS}
                referenceDate={referenceDate}
              />
            </section>

            <section aria-labelledby="body-composition-heading">
              <Card className="gap-5 shadow-sm sm:gap-6">
                <CardHeader className="px-4 sm:px-(--card-spacing)">
                  <CardTitle
                    id="body-composition-heading"
                    className="text-lg sm:text-xl"
                  >
                    身体組成の推移
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-2 sm:px-(--card-spacing)">
                  <BodyCompositionChart logs={logs} />
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </div>
    </main>
  )
}
