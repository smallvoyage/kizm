import { expect, test } from "@playwright/test"

test("fixture dashboard loads without Notion credentials", async ({ page }) => {
  await page.goto("/")

  await expect(
    page.getByRole("heading", { name: "フィットネス" })
  ).toBeVisible()
  await expect(page.getByRole("heading", { name: "食事状況" })).toBeVisible()
  await expect(
    page.getByRole("heading", { name: "トレーニング" })
  ).toBeVisible()
})
