import { expect, test } from "@playwright/test"

test.describe("DaysとWorkoutsが0件の空状態", () => {
  test.skip(
    () => process.env.FITNESS_FIXTURE_SCENARIO !== "empty",
    "This test requires FITNESS_FIXTURE_SCENARIO=empty."
  )

  test("空状態だけを表示してデータ表示やエラー表示を隠す", async ({ page }) => {
    await page.goto("/")

    await expect(page.getByRole("button", { name: /を画像化$/ })).toHaveCount(0)

    const emptyState = page
      .getByRole("alert")
      .filter({ hasText: "フィットネス記録がまだありません" })

    await test.step("空状態の見出しと説明を表示する", async () => {
      await expect(emptyState).toBeVisible()
      await expect(
        emptyState.getByText("フィットネス記録がまだありません", {
          exact: true,
        })
      ).toBeVisible()
      await expect(emptyState).toContainText(
        "Notionに記録を追加すると、ここにトレーニング、食事、身体組成の変化が表示されます。"
      )
    })

    await test.step("取得エラーとして表示しない", async () => {
      for (const errorTitle of [
        "データを読み込めませんでした",
        "日次データを読み込めませんでした",
        "トレーニングを読み込めませんでした",
      ]) {
        await expect(page.getByText(errorTitle, { exact: true })).toHaveCount(0)
      }
    })

    await test.step("データが必要なセクションを表示しない", async () => {
      for (const sectionName of [
        "週間レビュー",
        "食事状況",
        "身体組成",
        "トレーニング",
      ]) {
        await expect(
          page.getByRole("region", { name: sectionName, exact: true })
        ).toHaveCount(0)
      }
    })
  })
})
