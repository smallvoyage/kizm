import { expect, test } from "@playwright/test"

test("身体組成チャートの期間と表示指標を切り替えられる", async ({ page }) => {
  await page.goto("/")

  const chart = page
    .getByRole("region", { name: "身体組成" })
    .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
  const periods = chart.getByRole("group", { name: "表示期間" })
  const metrics = chart.getByRole("group", { name: "表示する身体組成の指標" })

  await test.step("7日・30日・90日・全期間を切り替える", async () => {
    const periodButtons = ["7日", "30日", "90日", "全期間"].map((name) =>
      periods.getByRole("button", { name, exact: true })
    )

    await expect(periodButtons[1]).toHaveAttribute("aria-pressed", "true")

    for (const button of periodButtons) {
      await button.click()
      await expect(button).toHaveAttribute("aria-pressed", "true")

      for (const otherButton of periodButtons.filter(
        (candidate) => candidate !== button
      )) {
        await expect(otherButton).toHaveAttribute("aria-pressed", "false")
      }
    }
  })

  await test.step("各指標を個別に切り替える", async () => {
    for (const name of ["体重", "体脂肪率", "筋肉量"]) {
      const button = metrics.getByRole("button", {
        name: new RegExp(`^${name}`),
      })
      await expect(button).toHaveAttribute("aria-pressed", "true")
      await button.click()
      await expect(button).toHaveAttribute("aria-pressed", "false")
      await button.click()
      await expect(button).toHaveAttribute("aria-pressed", "true")
    }
  })

  await test.step("最後の1系列は無効化できない", async () => {
    const weight = metrics.getByRole("button", { name: /^体重/ })
    const bodyFat = metrics.getByRole("button", { name: /^体脂肪率/ })
    const muscleMass = metrics.getByRole("button", { name: /^筋肉量/ })

    await weight.click()
    await bodyFat.click()

    await expect(muscleMass).toHaveAttribute("aria-pressed", "true")
    await expect(muscleMass).toBeDisabled()
  })
})
