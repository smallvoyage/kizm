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
