import { expect, test } from "@playwright/test"

const METRICS = ["体重", "体脂肪率", "体脂肪量", "骨格筋量"] as const

test("目標を指標ごとのカードで表示する", async ({ page }, testInfo) => {
  test.skip(
    !["chromium-320", "chromium-390"].includes(testInfo.project.name),
    "This check is scoped to mobile viewports."
  )

  await page.goto("/")

  const goal = page.getByRole("region", { name: "目標", exact: true })
  await expect(goal).toBeVisible()
  await expect(goal.getByText("2027年3月31日")).toBeVisible()

  for (const label of METRICS) {
    await test.step(`${label}のカード`, async () => {
      const card = goal.getByRole("article").filter({
        has: page.getByRole("heading", { name: label, exact: true }),
      })
      await expect(card).toBeVisible()
      await expect(card.getByText(/^目標 /)).toBeVisible()
      await expect(card.getByText(/^(達成|あと .+ (増|減))$/)).toBeVisible()
    })
  }

  await expect(goal.getByRole("progressbar")).toHaveCount(0)

  const pageWidth = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))
  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
})
