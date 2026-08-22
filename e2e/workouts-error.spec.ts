import { expect, test } from "@playwright/test"

test.describe("Workoutsだけ取得に失敗する部分エラー", () => {
  test.skip(
    () => process.env.FITNESS_FIXTURE_SCENARIO !== "workouts-error",
    "This test requires FITNESS_FIXTURE_SCENARIO=workouts-error."
  )

  test("食事と身体組成を表示してトレーニング領域だけにエラーを表示する", async ({
    page,
  }) => {
    await page.goto("/")

    await test.step("取得できた食事と身体組成を表示する", async () => {
      const nutrition = page.getByRole("region", {
        name: "食事状況",
        exact: true,
      })
      const bodyComposition = page
        .getByRole("region", { name: "身体組成", exact: true })
        .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })

      await expect(nutrition).toBeVisible()
      await expect(nutrition.getByRole("progressbar")).toHaveCount(4)
      await expect(bodyComposition).toBeVisible()
      await expect(bodyComposition.getByRole("application")).toBeVisible()
    })

    await test.step("トレーニング領域だけに取得エラーを表示する", async () => {
      const training = page.getByRole("region", {
        name: "トレーニング",
        exact: true,
      })
      const trainingError = training.getByRole("alert")

      await expect(training).toBeVisible()
      await expect(trainingError).toBeVisible()
      await expect(
        trainingError.getByText("トレーニングを読み込めませんでした", {
          exact: true,
        })
      ).toBeVisible()
      await expect(trainingError).toContainText(
        "FixtureのWorkouts取得に失敗しました。"
      )
      await expect(
        training.getByRole("combobox", { name: "種目" })
      ).toHaveCount(0)
    })

    await test.step("全体エラー表示に切り替わらない", async () => {
      await expect(page.getByRole("main").getByRole("alert")).toHaveCount(1)
      await expect(
        page.getByText("データを読み込めませんでした", { exact: true })
      ).toHaveCount(0)
      await expect(
        page.getByText("日次データを読み込めませんでした", { exact: true })
      ).toHaveCount(0)
    })
  })
})
