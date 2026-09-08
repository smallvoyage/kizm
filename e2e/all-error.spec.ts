import { expect, test } from "@playwright/test"

test("DaysとWorkoutsの取得失敗時に全体エラーだけを表示する", async ({
  page,
}) => {
  test.skip(
    process.env.FITNESS_FIXTURE_SCENARIO !== "all-error",
    "This test requires the all-error fixture scenario."
  )

  await page.goto("/")
  await expect(page.getByRole("button", { name: /を画像化$/ })).toHaveCount(0)

  const alert = page.getByRole("main").getByRole("alert")

  await test.step("全体エラーの見出しと説明を表示する", async () => {
    await expect(alert).toHaveCount(1)
    await expect(alert).toContainText("データを読み込めませんでした")
    await expect(alert).toContainText("Daysデータを取得できませんでした。")
    await expect(alert).toContainText("Workoutsデータを取得できませんでした。")
  })

  await test.step("空状態を表示しない", async () => {
    await expect(
      page.getByText("フィットネス記録がまだありません")
    ).toHaveCount(0)
    await expect(
      page.getByText("最近のフィットネス記録がありません")
    ).toHaveCount(0)
  })

  await test.step("通常ダッシュボードを表示しない", async () => {
    for (const name of [
      "週間レビュー",
      "食事状況",
      "身体組成",
      "トレーニング",
    ]) {
      await expect(page.getByRole("region", { name })).toHaveCount(0)
    }
  })
})
