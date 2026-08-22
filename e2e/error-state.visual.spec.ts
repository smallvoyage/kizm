import { expect, test } from "@playwright/test"

test(
  "390px dashboard matches the all-error snapshot",
  {
    tag: "@visual",
  },
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-390",
      "This visual baseline is scoped to the 390px viewport."
    )
    test.skip(
      process.env.FITNESS_FIXTURE_SCENARIO !== "all-error",
      "This visual baseline requires FITNESS_FIXTURE_SCENARIO=all-error."
    )

    await page.goto("/")

    const alert = page.getByRole("main").getByRole("alert")

    await expect(alert).toHaveCount(1)
    await expect(alert).toContainText("データを読み込めませんでした")
    await expect(alert).toContainText("Daysデータを取得できませんでした。")
    await expect(alert).toContainText("Workoutsデータを取得できませんでした。")

    await expect(page).toHaveScreenshot("dashboard-all-error.png", {
      animations: "disabled",
      fullPage: true,
    })
  }
)

test(
  "390px training region matches the workouts-error snapshot",
  {
    tag: "@visual",
  },
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-390",
      "This visual baseline is scoped to the 390px viewport."
    )
    test.skip(
      process.env.FITNESS_FIXTURE_SCENARIO !== "workouts-error",
      "This visual baseline requires FITNESS_FIXTURE_SCENARIO=workouts-error."
    )

    await page.goto("/")

    const training = page.getByRole("region", {
      name: "トレーニング",
      exact: true,
    })
    const alert = training.getByRole("alert")

    await expect(alert).toContainText("トレーニングを読み込めませんでした")
    await expect(alert).toContainText("FixtureのWorkouts取得に失敗しました。")
    await expect(
      page.getByRole("region", { name: "食事状況", exact: true })
    ).toBeVisible()
    await expect(
      page
        .getByRole("region", { name: "身体組成", exact: true })
        .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
    ).toBeVisible()

    await expect(training).toHaveScreenshot("training-workouts-error.png", {
      animations: "disabled",
    })
  }
)
