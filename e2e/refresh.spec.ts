import { expect, test } from "@playwright/test"

test("refresh操作後にfixture dashboardの主要表示が維持される", async ({
  page,
}) => {
  await page.goto("/")

  const refreshButton = page.getByRole("button", {
    name: "Notionのデータを更新",
  })
  const weeklyReview = page.getByRole("region", { name: "週間レビュー" })
  const nutrition = page.getByRole("region", {
    name: "食事状況",
    exact: true,
  })
  const bodyComposition = page
    .getByRole("region", { name: "身体組成" })
    .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
  const training = page.getByRole("region", { name: "トレーニング" })

  await expect(refreshButton).toBeEnabled()
  await expect(weeklyReview).toBeVisible()

  const serverActionResponse = page.waitForResponse((response) => {
    const request = response.request()

    return (
      request.method() === "POST" && Boolean(request.headers()["next-action"])
    )
  })

  await refreshButton.click()
  expect((await serverActionResponse).ok()).toBe(true)
  await expect(refreshButton).toBeEnabled()
  await expect(refreshButton).toHaveAttribute("data-state", "default")

  await expect(weeklyReview).toBeVisible()
  await expect(nutrition).toBeVisible()
  await expect(bodyComposition).toBeVisible()
  await expect(training).toBeVisible()
})
