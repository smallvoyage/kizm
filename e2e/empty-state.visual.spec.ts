import { expect, test } from "@playwright/test"

test(
  "390px empty dashboard matches the empty-state snapshot",
  {
    tag: "@visual",
  },
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-390",
      "This visual baseline is scoped to the 390px viewport."
    )
    test.skip(
      process.env.FITNESS_FIXTURE_SCENARIO !== "empty",
      "This visual baseline requires FITNESS_FIXTURE_SCENARIO=empty."
    )

    await page.goto("/")

    const emptyState = page
      .getByRole("alert")
      .filter({ hasText: "フィットネス記録がまだありません" })

    await expect(emptyState).toBeVisible()
    await expect(page.getByText("データを読み込めませんでした")).toHaveCount(0)
    await expect(
      page.getByRole("region", { name: "週間レビュー" })
    ).toHaveCount(0)

    await expect(page).toHaveScreenshot("dashboard-empty.png", {
      animations: "disabled",
      fullPage: true,
    })
  }
)
