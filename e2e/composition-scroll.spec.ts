import { expect, type Page, test } from "@playwright/test"

test.use({ hasTouch: true })

const dense = process.env.FITNESS_FIXTURE_SCENARIO === "dense-composition"
const latest = dense ? "2026年8月23日" : "2026年8月16日"

function chart(page: Page) {
  return page.locator(".dashboard-section--chart")
}

async function swipe(
  page: Page,
  start: { x: number; y: number },
  end: { x: number; y: number }
) {
  const session = await page.context().newCDPSession(page)
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [start],
  })
  for (let step = 1; step <= 12; step++) {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        {
          x: start.x + ((end.x - start.x) * step) / 12,
          y: start.y + ((end.y - start.y) * step) / 12,
        },
      ],
    })
    await page.waitForTimeout(16)
  }
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  })
  await session.detach()
}

test("期間を切り替えても点間隔を保ち、選択日と値が一致する", async ({
  page,
}, testInfo) => {
  await page.goto("/")
  const composition = chart(page)
  const periods = composition.getByRole("group", { name: "表示期間" })
  const date = composition.locator(".composition-chart-meta")
  const scroller = composition.locator(".composition-scroll")
  await expect(
    periods.getByRole("button", { name: "30日", exact: true })
  ).toHaveAttribute("aria-pressed", "true")
  await expect(date).toContainText(latest)
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)

  for (const name of ["30日", "取得済み全体"]) {
    await periods.getByRole("button", { name, exact: true }).click()
    const gaps = await composition
      .locator(".recharts-line-dot")
      .evaluateAll((dots) => {
        const x = dots.map((dot) => Number(dot.getAttribute("cx")))
        return x.slice(1).map((value, index) => value - x[index])
      })
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(43.99)
    for (const button of await periods.getByRole("button").all()) {
      const box = await button.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }
  }
  const surface = composition.getByRole("application")
  await surface.focus()
  await surface.press("Home")
  await expect(date).toContainText(dense ? "2026年5月27日" : "2026年7月13日")
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollLeft))
    .toBeLessThan(50)
  await surface.press("ArrowRight")
  await expect(date).toContainText(dense ? "2026年5月28日" : "2026年7月14日")
  await periods.getByRole("button", { name: "30日", exact: true }).click()
  await expect(date).toContainText(latest)
  await surface.focus()
  await surface.press("Home")
  await expect(date).toContainText(dense ? "2026年7月26日" : "2026年7月25日")
  await surface.press("End")
  await expect(date).toContainText(latest)
  await periods.getByRole("button", { name: "7日", exact: true }).click()
  if (dense) {
    await expect(date).toContainText(latest)
    await expect(composition.locator(".recharts-line-dot")).toHaveCount(7)
  } else {
    await expect(
      composition.getByText("この期間の指標のデータはありません。")
    ).toBeVisible()
    await expect(date).toContainText("記録なし")
    await expect(
      composition.locator(".composition-selected-value")
    ).toHaveCount(0)
  }
  await periods.getByRole("button", { name: "30日", exact: true }).click()
  await expect(date).toContainText(latest)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await composition.screenshot({
    path: testInfo.outputPath("composition-30-days.png"),
  })
})

test("タッチで横スクロールした後もタップ位置が正しく、縦スクロールを妨げない", async ({
  page,
  browserName,
}, testInfo) => {
  test.skip(
    browserName !== "chromium",
    "Touch gestures use Chromium's input protocol."
  )
  await page.goto("/")
  const composition = chart(page)
  const scroller = composition.locator(".composition-scroll")
  const date = composition.locator(".composition-chart-meta")
  await scroller.scrollIntoViewIfNeeded()
  await expect(date).toContainText(latest)
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0)
  const initialLeft = await scroller.evaluate((el) => el.scrollLeft)
  const axisBefore = await composition
    .locator(".composition-fixed-axis")
    .boundingBox()
  const box = await scroller.boundingBox()
  if (!box) throw new Error("Chart viewport missing")
  await swipe(
    page,
    { x: box.x + 35, y: box.y + 90 },
    { x: box.x + box.width - 25, y: box.y + 90 }
  )
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollLeft))
    .toBeLessThan(initialLeft - 40)
  await expect(date).toContainText(latest)
  // Let native momentum finish before a deliberate tap.
  await page.waitForTimeout(700)
  expect(
    (await composition.locator(".composition-fixed-axis").boundingBox())?.x
  ).toBe(axisBefore?.x)
  const targets = await scroller.evaluate((el) => {
    const viewport = el.getBoundingClientRect()
    return [...el.querySelectorAll(".recharts-line-dot")]
      .map((dot) => {
        const bounds = dot.getBoundingClientRect()
        return {
          x: bounds.x + bounds.width / 2,
          y: viewport.y + 50,
          index: Number(dot.getAttribute("cx")),
        }
      })
      .filter((dot) => dot.x > viewport.x + 24 && dot.x < viewport.right - 24)
      .slice(0, 2)
  })
  expect(targets).toHaveLength(2)
  await page.touchscreen.tap(targets[0].x, targets[0].y)
  const firstDate = await date.innerText()
  await page.touchscreen.tap(targets[1].x, targets[1].y)
  await expect(date).not.toHaveText(firstDate)
  // The selected marker must be at the tapped column, even after scrolling.
  const selected = await composition
    .locator(".recharts-reference-dot circle")
    .boundingBox()
  expect(selected).not.toBeNull()
  expect(
    Math.abs((selected?.x ?? 0) + (selected?.width ?? 0) / 2 - targets[1].x)
  ).toBeLessThan(1)
  const beforeSwipeDate = await date.textContent()
  const beforeY = await page.evaluate(() => scrollY)
  const currentBox = await scroller.boundingBox()
  if (!currentBox) throw new Error("Chart viewport missing")
  await swipe(
    page,
    { x: currentBox.x + 60, y: currentBox.y + 140 },
    { x: currentBox.x + 60, y: currentBox.y + 40 }
  )
  await expect
    .poll(() => page.evaluate(() => scrollY))
    .toBeGreaterThan(beforeY + 30)
  await expect(date).toHaveText(beforeSwipeDate ?? "")
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth
    )
  ).toBe(true)
  await composition.screenshot({
    path: testInfo.outputPath("composition-scrolled.png"),
  })
})

test("高密度データで欠測、1点、指標の空状態を切り替える", async ({ page }) => {
  test.skip(!dense, "Requires dense-composition fixture.")
  await page.goto("/")
  const composition = chart(page)
  const date = composition.locator(".composition-chart-meta")
  const periods = composition.getByRole("group", { name: "表示期間" })
  const metrics = composition.getByRole("group", {
    name: "表示する身体組成の指標",
  })
  await periods.getByRole("button", { name: "取得済み全体" }).click()
  const surface = composition.getByRole("application")
  await surface.focus()
  await surface.press("Home")
  await expect(date).toContainText("2026年5月27日")
  await metrics.getByRole("button", { name: /^体脂肪率/ }).click()
  await expect(date).toContainText(latest)
  await expect(composition.locator(".recharts-line-dot")).toHaveCount(1)
  await periods.getByRole("button", { name: "7日", exact: true }).click()
  await expect(date).toContainText(latest)
  await metrics.getByRole("button", { name: /^筋肉量/ }).click()
  await expect(date).toContainText("記録なし")
  await expect(
    composition.getByText("この期間の指標のデータはありません。")
  ).toBeVisible()
  await periods.getByRole("button", { name: "取得済み全体" }).click()
  await expect(date).toContainText("2026年5月26日")
  await expect(composition.locator(".recharts-line-dot")).toHaveCount(1)
  await periods.getByRole("button", { name: "30日", exact: true }).click()
  await expect(date).toContainText("記録なし")
})
