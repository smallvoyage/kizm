import { expect, test } from "@playwright/test"

test("身体組成チャートの表示指標を1つずつ切り替えられる", async ({ page }) => {
  await page.goto("/")

  const chart = page
    .getByRole("region", { name: "身体組成" })
    .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
  const metrics = chart.getByRole("group", {
    name: "表示する身体組成の指標",
  })
  const weight = metrics.getByRole("button", { name: /^体重/ })
  const bodyFat = metrics.getByRole("button", { name: /^体脂肪率/ })
  const muscleMass = metrics.getByRole("button", { name: /^筋肉量/ })

  await expect(chart.getByRole("group", { name: "表示期間" })).toHaveCount(0)

  await test.step("初期表示では体重だけが選択される", async () => {
    await expect(weight).toHaveAttribute("aria-pressed", "true")
    await expect(bodyFat).toHaveAttribute("aria-pressed", "false")
    await expect(muscleMass).toHaveAttribute("aria-pressed", "false")
  })

  await test.step("各指標を選ぶと他の指標が解除される", async () => {
    for (const [selected, unselected] of [
      [bodyFat, [weight, muscleMass]],
      [muscleMass, [weight, bodyFat]],
      [weight, [bodyFat, muscleMass]],
    ] as const) {
      await selected.click()
      await expect(selected).toHaveAttribute("aria-pressed", "true")

      for (const button of unselected) {
        await expect(button).toHaveAttribute("aria-pressed", "false")
      }
    }
  })

  await test.step("選択中の指標を再度押しても選択が維持される", async () => {
    await weight.click()
    await expect(weight).toHaveAttribute("aria-pressed", "true")
    await expect(bodyFat).toHaveAttribute("aria-pressed", "false")
    await expect(muscleMass).toHaveAttribute("aria-pressed", "false")
  })
})
