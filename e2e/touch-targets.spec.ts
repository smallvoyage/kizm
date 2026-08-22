import { expect, type Locator, test } from "@playwright/test"

const MINIMUM_TOUCH_TARGET_SIZE = 44

async function expectMinimumTouchTarget(locator: Locator) {
  await expect(locator).toBeVisible()

  const bounds = await locator.boundingBox()

  expect(bounds, "可視要素の境界ボックスを取得できること").not.toBeNull()
  expect(bounds?.width, "タッチ領域の幅").toBeGreaterThanOrEqual(
    MINIMUM_TOUCH_TARGET_SIZE
  )
  expect(bounds?.height, "タッチ領域の高さ").toBeGreaterThanOrEqual(
    MINIMUM_TOUCH_TARGET_SIZE
  )
}

test("モバイルの主要操作が44px以上のタッチ領域を持つ", async ({
  page,
}, testInfo) => {
  test.skip(
    !["chromium-320", "chromium-390"].includes(testInfo.project.name),
    "This touch-target check is scoped to mobile viewports."
  )

  await page.goto("/")

  await test.step("refresh", async () => {
    await expectMinimumTouchTarget(
      page.getByRole("button", { name: "Notionのデータを更新" })
    )
  })

  await test.step("期間切り替え", async () => {
    const weekNavigation = page.getByRole("navigation", {
      name: "表示する週を選択",
    })

    await expectMinimumTouchTarget(
      weekNavigation.getByRole("button", { name: "前の週を表示" })
    )
    await expectMinimumTouchTarget(
      weekNavigation.getByRole("button", { name: "次の週を表示" })
    )
  })

  await test.step("指標切り替え", async () => {
    const metrics = page.getByRole("group", {
      name: "表示する身体組成の指標",
    })

    for (const name of [/^体重/, /^体脂肪率/, /^筋肉量/]) {
      await expectMinimumTouchTarget(metrics.getByRole("button", { name }))
    }
  })

  await test.step("Workout種目選択", async () => {
    await expectMinimumTouchTarget(
      page
        .getByRole("region", { name: "トレーニング" })
        .getByRole("combobox", { name: "種目" })
    )
  })
})
