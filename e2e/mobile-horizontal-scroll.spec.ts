import { expect, test } from "@playwright/test"

test("320px画面で横スクロールが発生しない", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium-320",
    "This test is scoped to the 320px viewport."
  )

  await page.goto("/")
  await expect(page.getByRole("heading", { name: "KIZM" })).toBeVisible()

  const pageWidth = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: document.documentElement.clientWidth,
  }))

  expect(pageWidth.content).toBeLessThanOrEqual(pageWidth.viewport)
})
