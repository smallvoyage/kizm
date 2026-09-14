import { expect, type Locator, test } from "@playwright/test"

async function pinch(
  scrollArea: Locator,
  initialDistance: number,
  currentDistance: number
) {
  await scrollArea.evaluate(
    (element, distances) => {
      const centerX =
        element.getBoundingClientRect().left + element.clientWidth / 2
      const centerY =
        element.getBoundingClientRect().top + element.clientHeight / 2

      const createTouches = (distance: number) => [
        new Touch({
          identifier: 1,
          target: element,
          clientX: centerX - distance / 2,
          clientY: centerY,
        }),
        new Touch({
          identifier: 2,
          target: element,
          clientX: centerX + distance / 2,
          clientY: centerY,
        }),
      ]
      const initialTouches = createTouches(distances.initialDistance)
      const currentTouches = createTouches(distances.currentDistance)

      element.dispatchEvent(
        new TouchEvent("touchstart", {
          bubbles: true,
          cancelable: true,
          touches: initialTouches,
          targetTouches: initialTouches,
          changedTouches: initialTouches,
        })
      )
      element.dispatchEvent(
        new TouchEvent("touchmove", {
          bubbles: true,
          cancelable: true,
          touches: currentTouches,
          targetTouches: currentTouches,
          changedTouches: currentTouches,
        })
      )
      element.dispatchEvent(
        new TouchEvent("touchend", {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: currentTouches,
        })
      )
    },
    { initialDistance, currentDistance }
  )
}

test("身体組成チャートの表示指標を1つずつ切り替えられる", async ({ page }) => {
  await page.goto("/")

  const chart = page
    .getByRole("region", { name: "身体組成" })
    .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
  const metrics = chart.getByRole("group", {
    name: "表示する身体組成の指標",
  })
  const weight = metrics.getByRole("button", { name: /^体重/ })
  const bodyFat = metrics.getByRole("button", { name: /^体脂肪率/ })
  const muscleMass = metrics.getByRole("button", { name: /^筋肉量/ })

  await expect(chart.getByRole("group", { name: "表示期間" })).toHaveCount(0)

  await test.step("初期表示では体重だけが選択される", async () => {
    await expect(weight).toHaveAttribute("aria-pressed", "true")
    await expect(bodyFat).toHaveAttribute("aria-pressed", "false")
    await expect(muscleMass).toHaveAttribute("aria-pressed", "false")
  })

  await test.step("各指標を選ぶと他の指標が解除される", async () => {
    for (const [selected, unselected] of [
      [bodyFat, [weight, muscleMass]],
      [muscleMass, [weight, bodyFat]],
      [weight, [bodyFat, muscleMass]],
    ] as const) {
      await selected.click()
      await expect(selected).toHaveAttribute("aria-pressed", "true")

      for (const button of unselected) {
        await expect(button).toHaveAttribute("aria-pressed", "false")
      }
    }
  })

  await test.step("選択中の指標を再度押しても選択が維持される", async () => {
    await weight.click()
    await expect(weight).toHaveAttribute("aria-pressed", "true")
    await expect(bodyFat).toHaveAttribute("aria-pressed", "false")
    await expect(muscleMass).toHaveAttribute("aria-pressed", "false")
  })
})

test("モバイルでは横軸の間隔を固定してグラフを横スクロールできる", async ({
  page,
}, testInfo) => {
  test.skip(
    !["chromium-320", "chromium-390"].includes(testInfo.project.name),
    "モバイル幅のレイアウトを検証するテストです。"
  )

  await page.goto("/")

  const chart = page
    .getByRole("region", { name: "身体組成" })
    .filter({ hasText: "指標を選んで、記録ごとの変化を確認" })
  const scrollArea = chart.getByRole("region", {
    name: "身体組成グラフ。横方向にスクロールできます",
  })

  await expect(scrollArea).toBeVisible()
  await expect
    .poll(() => scrollArea.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(0)

  const dimensions = await scrollArea.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollLeft: element.scrollLeft,
    scrollWidth: element.scrollWidth,
  }))
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth)
  expect(dimensions.scrollLeft).toBeGreaterThan(0)
  await expect(
    scrollArea.locator(".recharts-yAxis-tick-labels text").first()
  ).toBeVisible()

  await scrollArea.focus()
  await page.keyboard.press("ArrowLeft")
  await expect
    .poll(() => scrollArea.evaluate((element) => element.scrollLeft))
    .toBeLessThan(dimensions.scrollLeft)

  const pointPositions = await scrollArea
    .locator(".recharts-line-dots circle")
    .evaluateAll((points) =>
      points.map((point) => Number(point.getAttribute("cx")))
    )
  const intervals = pointPositions
    .slice(1)
    .map(
      (position, index) =>
        Math.round((position - pointPositions[index]) * 10) / 10
    )

  expect(new Set(intervals)).toEqual(new Set([56]))

  await scrollArea.evaluate((element) => {
    element.scrollLeft = 0
  })
  await expect
    .poll(() => scrollArea.evaluate((element) => element.scrollLeft))
    .toBe(0)
})

test("モバイルではピンチ操作で表示日数を変更できる", async ({
  page,
}, testInfo) => {
  test.skip(
    !["chromium-320", "chromium-390"].includes(testInfo.project.name),
    "モバイル幅のタッチ操作を検証するテストです。"
  )

  await page.goto("/")

  const scrollArea = page.getByRole("region", {
    name: "身体組成グラフ。横方向にスクロールできます",
  })

  await expect(scrollArea).toHaveAttribute("data-point-interval", "56")

  await pinch(scrollArea, 100, 150)
  await expect(scrollArea).toHaveAttribute("data-point-interval", "84")
  await expect(scrollArea).toContainText("現在の表示範囲は約")

  const expandedIntervals = await scrollArea
    .locator(".recharts-line-dots circle")
    .evaluateAll((points) =>
      points.slice(1).map((point, index) => {
        const previousX = Number(points[index].getAttribute("cx"))
        const currentX = Number(point.getAttribute("cx"))
        return Math.round((currentX - previousX) * 10) / 10
      })
    )
  expect(new Set(expandedIntervals)).toEqual(new Set([84]))

  await pinch(scrollArea, 100, 50)
  await expect(scrollArea).toHaveAttribute("data-point-interval", "42")
})
