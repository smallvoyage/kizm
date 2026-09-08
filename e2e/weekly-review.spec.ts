import { expect, type Locator, type Page, test } from "@playwright/test"

const scenario = process.env.FITNESS_FIXTURE_SCENARIO ?? "normal"
const referenceDate = process.env.PLAYWRIGHT_REFERENCE_DATE ?? "2026-09-08"

test.beforeEach(async ({ page }) => {
  test.skip(
    !["normal", "missing-nutrition"].includes(scenario),
    "食事データのfixtureを使用する"
  )
  await page.goto("/")
})

async function expectReadable(page: Page, nutrition: Locator) {
  await expect(nutrition).toBeVisible()
  await expect(
    page.getByRole("article", { name: "摂取カロリー", exact: true })
  ).toBeVisible()
  // Check each text block, including reasons and metadata, for horizontal clipping.
  const overflow = await nutrition
    .locator("p, span, strong")
    .evaluateAll((elements) =>
      elements
        .filter((element) => {
          if (element.classList.contains("sr-only")) return false
          const bounds = element.getBoundingClientRect()
          return (
            bounds.width > 0 &&
            (bounds.left < 0 ||
              bounds.right > document.documentElement.clientWidth + 1 ||
              (element.scrollWidth > element.clientWidth + 1 &&
                getComputedStyle(element).display !== "inline"))
          )
        })
        .map((element) => element.textContent)
    )
  expect(overflow).toEqual([])
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(
    await page.evaluate(() => document.documentElement.clientWidth)
  )
}

test("終了済み週の平均・記録日数・前週差または不足理由を表示する", async ({
  page,
}) => {
  test.skip(referenceDate < "2026-08-17", "終了済み週を検証する")
  const nutrition = page.getByRole("region", { name: "食事", exact: true })
  const calories = nutrition.getByRole("article", { name: "摂取カロリー" })
  const protein = nutrition.getByRole("article", { name: "たんぱく質" })
  await expect(nutrition.getByText("集計対象 8/10–8/16")).toBeVisible()
  await expect(
    calories.getByText("前週の記録 7/7日", { exact: true })
  ).toBeVisible()

  if (scenario === "missing-nutrition") {
    await expect(
      calories.getByText("記録 6/7日", { exact: true })
    ).toBeVisible()
    await expect(protein.getByText("記録 5/7日", { exact: true })).toBeVisible()
    await expect(calories.getByText("記録日が不足しています")).toBeVisible()
    await expect(nutrition.getByText(/前週比/)).toHaveCount(0)
    await expect(nutrition.locator(".weekly-comparison svg")).toHaveCount(0)
  } else {
    await expect(calories.locator(".weekly-average-value")).toHaveText(
      "2,352.9kcal"
    )
    await expect(
      calories.getByText("記録 7/7日", { exact: true })
    ).toBeVisible()
    await expect(
      calories.getByText("前週比 -34.3 kcal", { exact: true })
    ).toBeVisible()
    await expect(nutrition.getByText(/前週比/)).toHaveCount(4)
  }
  await expectReadable(page, nutrition)
})

test("週送りの限界、前週データ不足、更新後の表示を確認する", async ({
  page,
}) => {
  test.skip(referenceDate < "2026-08-17", "終了済み週を検証する")
  const navigation = page.getByRole("navigation", { name: "表示する週を選択" })
  const previous = navigation.getByRole("button", { name: "前の週を表示" })
  const next = navigation.getByRole("button", { name: "次の週を表示" })
  const nutrition = page.getByRole("region", { name: "食事", exact: true })
  await expect(next).toBeDisabled()
  for (const button of [previous, next]) {
    const box = await button.boundingBox()
    expect(box?.width).toBeGreaterThanOrEqual(44)
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
  await previous.focus()
  await page.keyboard.press("Enter")
  await expect(navigation.getByText("8/3–8/9", { exact: true })).toBeVisible()
  for (let step = 0; step < 3; step++) await previous.click()
  await expect(previous).toBeDisabled()
  await expect(navigation.getByText("7/13–7/19", { exact: true })).toBeVisible()
  await expect(
    nutrition.getByText("前週のデータ不足", { exact: true })
  ).toHaveCount(4)
  await expectReadable(page, nutrition)
  for (let step = 0; step < 4; step++) await next.click()
  await expect(next).toBeDisabled()

  const response = page.waitForResponse(
    (result) =>
      result.request().method() === "POST" &&
      Boolean(result.request().headers()["next-action"])
  )
  await page.getByRole("button", { name: "Notionのデータを更新" }).click()
  expect((await response).ok()).toBe(true)
  await expect(nutrition.getByText("集計対象 8/10–8/16")).toBeVisible()
  await expectReadable(page, nutrition)
})

test("週の途中は昨日までを平均し、週を戻すと前週差を表示する", async ({
  page,
}) => {
  test.skip(
    referenceDate !== "2026-08-12",
    "サーバー日時を水曜日に固定して検証する"
  )
  const nutrition = page.getByRole("region", { name: "食事", exact: true })
  const calories = nutrition.getByRole("article", { name: "摂取カロリー" })
  await expect(nutrition.getByText("昨日までの記録日の1日平均")).toBeVisible()
  await expect(nutrition.getByText("集計対象 8/10–8/11")).toBeVisible()
  await expect(calories.locator(".weekly-average-value")).toHaveText(
    "2,290kcal"
  )
  await expect(calories.getByText("記録 2/2日", { exact: true })).toBeVisible()
  await expect(nutrition.getByText("週の途中のため比較なし")).toHaveCount(4)
  await expect(nutrition.getByText(/前週比/)).toHaveCount(0)
  await expect(nutrition.locator(".weekly-comparison svg")).toHaveCount(0)
  await expectReadable(page, nutrition)

  await page.getByRole("button", { name: "前の週を表示" }).click()
  await expect(nutrition.getByText("集計対象 8/3–8/9")).toBeVisible()
  await expect(nutrition.getByText(/前週比/)).toHaveCount(4)
  await expectReadable(page, nutrition)
  await page.getByRole("button", { name: "次の週を表示" }).click()
  await expect(nutrition.getByText("週の途中のため比較なし")).toHaveCount(4)
})
