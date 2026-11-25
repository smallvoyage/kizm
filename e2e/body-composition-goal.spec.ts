import { expect, test } from "@playwright/test"

const PATTERNS = ["リスト", "カード", "トラック", "ダイジェスト"] as const

test("最終目標の表示パターンを切り替えて確認できる", async ({
  page,
}, testInfo) => {
  test.skip(
    !["chromium-320", "chromium-390"].includes(testInfo.project.name),
    "This check is scoped to mobile viewports."
  )

  await page.goto("/")

  const goal = page.getByRole("region", { name: "最終目標" })
  await expect(goal).toBeVisible()
  await expect(goal.getByText("2027年3月31日")).toBeVisible()

  const switcher = goal.getByRole("group", { name: "最終目標の表示パターン" })

  await test.step("初期表示はリスト", async () => {
    await expect(
      switcher.getByRole("button", { name: "リスト" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  for (const name of PATTERNS) {
    await test.step(`${name}を表示する`, async () => {
      const button = switcher.getByRole("button", { name })
      await button.click()
      await expect(button).toHaveAttribute("aria-pressed", "true")

      const bounds = await button.boundingBox()
      expect(bounds?.width).toBeGreaterThanOrEqual(44)
      expect(bounds?.height).toBeGreaterThanOrEqual(44)

      for (const label of ["体重", "体脂肪率", "体脂肪量", "骨格筋量"]) {
        await expect(
          goal.getByText(label, { exact: true }).first()
        ).toBeVisible()
      }

      const pageWidth = await page.evaluate(() => ({
        content: document.documentElement.scrollWidth,
        viewport: document.documentElement.clientWidth,
      }))
      expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
    })
  }

  await test.step("選んだパターンを再読み込み後も保持する", async () => {
    await page.reload()
    await expect(
      page
        .getByRole("region", { name: "最終目標" })
        .getByRole("button", { name: "ダイジェスト" })
    ).toHaveAttribute("aria-pressed", "true")
  })
})
