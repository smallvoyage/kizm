import { expect, test } from "@playwright/test"

test("390px dashboard matches the normal-state snapshot", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-390",
    "This visual baseline is scoped to the 390px viewport."
  )

  await page.goto("/")
  await expect(page.getByRole("heading", { name: "KIZM" })).toBeVisible()

  await expect(page).toHaveScreenshot("dashboard-normal.png", {
    animations: "disabled",
    fullPage: true,
  })
})

test("390px body composition chart matches every metric snapshot", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-390",
    "These visual baselines are scoped to the 390px viewport."
  )

  await page.goto("/")

  const bodyComposition = page
    .getByRole("region", { name: "身体組成" })
    .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
  const metrics = bodyComposition.getByRole("group", {
    name: "表示する身体組成の指標",
  })
  const chart = bodyComposition.getByRole("application")

  for (const metric of [
    { buttonName: /^体重/, snapshotName: "body-composition-weight.png" },
    {
      buttonName: /^体脂肪率/,
      snapshotName: "body-composition-body-fat.png",
    },
    {
      buttonName: /^筋肉量/,
      snapshotName: "body-composition-muscle-mass.png",
    },
  ]) {
    await test.step(`${metric.snapshotName} の系列を撮影する`, async () => {
      const button = metrics.getByRole("button", { name: metric.buttonName })

      await button.click()
      await expect(button).toHaveAttribute("aria-pressed", "true")
      await expect(chart).toBeVisible()

      await expect(bodyComposition).toHaveScreenshot(metric.snapshotName, {
        animations: "disabled",
      })
    })
  }
})
