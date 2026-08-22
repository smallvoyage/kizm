import { expect, test } from "@playwright/test"

test("Workout種目を切り替えると最新代表セットと推移が更新される", async ({
  page,
}) => {
  await page.goto("/")

  const training = page.getByRole("region", { name: "トレーニング" })
  const exercise = training.getByRole("combobox", { name: "種目" })
  const summary = training.locator(".training-summary")
  const chart = training.locator(".training-chart-panel")
  const history = chart.getByRole("list", { includeHidden: true })

  await test.step("初期表示ではバックスクワットが選択される", async () => {
    await expect(exercise).toHaveValue("バックスクワット")
    await expect(summary).toContainText("最新 · 8月16日")
    await expect(summary).toContainText("100 kg × 6 回")
    await expect(history).toContainText("7月19日: 80 kg × 6 回")
    await expect(history).toContainText("8月16日: 100 kg × 6 回")
  })

  await test.step("ベンチプレスへ切り替えると表示内容が更新される", async () => {
    await exercise.selectOption("ベンチプレス")

    await expect(exercise).toHaveValue("ベンチプレス")
    await expect(summary).toContainText("最新 · 8月16日")
    await expect(summary).toContainText("70 kg × 8 回")
    await expect(summary).toContainText("前回 · 67.5 kg × 8 回")
    await expect(chart).toContainText("8月16日70 kg × 8 回")
    await expect(history).toContainText("7月19日: 60 kg × 8 回")
    await expect(history).toContainText("8月16日: 70 kg × 8 回")
    await expect(training.getByText("100 kg × 6 回")).toHaveCount(0)
  })
})
