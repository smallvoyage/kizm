import { expect, test } from "@playwright/test"

test("fixture dashboard shows its primary sections", async ({ page }) => {
  await page.goto("/")

  await expect(page.getByRole("heading", { name: "KIZM" })).toBeVisible()

  await test.step("weekly review", async () => {
    const weeklyReview = page.getByRole("region", { name: "週間レビュー" })

    await expect(weeklyReview).toBeVisible()
    await expect(weeklyReview.getByText("最新の週")).toBeVisible()
    await expect(
      weeklyReview.getByRole("heading", { name: "食事", level: 3 })
    ).toBeVisible()
    await expect(weeklyReview.getByText("7日平均体重")).toBeVisible()
  })

  await test.step("nutrition summary and heatmap", async () => {
    const nutrition = page.getByRole("region", {
      name: "食事状況",
      exact: true,
    })
    const summary = nutrition.getByRole("region", {
      name: "最新の食事状況",
    })
    const heatmap = nutrition.getByRole("region", {
      name: "12週間の達成状況",
    })

    await expect(nutrition).toBeVisible()
    await expect(summary.getByRole("progressbar")).toHaveCount(4)
    await expect(heatmap).toBeVisible()
    await expect(heatmap.getByRole("button")).toHaveCount(84)
    await expect(heatmap.getByRole("button").first()).toHaveAttribute(
      "aria-label",
      /^2026年6月1日/
    )
    await expect(heatmap.getByRole("button").last()).toHaveAttribute(
      "aria-label",
      /^2026年8月23日/
    )
    await expect(heatmap.getByRole("button").last()).toBeEnabled()
  })

  await test.step("body composition chart", async () => {
    const bodyComposition = page
      .getByRole("region", { name: "身体組成" })
      .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })

    await expect(bodyComposition).toBeVisible()
    await expect(
      bodyComposition.getByRole("button", { name: /^体重/, pressed: true })
    ).toBeVisible()
    await expect(bodyComposition.getByText("測定日")).toBeVisible()
    await expect(bodyComposition.getByRole("application")).toBeVisible()
  })

  await test.step("training progress", async () => {
    const training = page.getByRole("region", { name: "トレーニング" })

    await expect(training).toBeVisible()
    await expect(training.getByRole("combobox", { name: "種目" })).toHaveValue(
      "バックスクワット"
    )
    await expect(training.getByText("100 kg × 6 回").first()).toBeVisible()
    await expect(training.getByText("重量の推移")).toBeVisible()
    await expect(training.getByRole("application")).toBeVisible()
  })
})
