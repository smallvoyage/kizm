import { expect, test } from "@playwright/test"
import { renderRecordInBrowser } from "./helpers/training-record-renderer"

const exports = [
  {
    trigger: "トレーニング記録を画像化",
    title: "トレーニング記録",
    filename: "training-record-2026-08-16.png",
  },
  {
    trigger: "体組成・カロリー・PFCを画像化",
    title: "日次サマリー",
    filename: "daily-summary-2026-08-16.png",
  },
]

test.beforeEach(async ({ page }) => {
  await page.goto("/")
})

for (const item of exports) {
  test(`${item.title}: 全画像へのスクロール、保存、閉じる、再表示`, async ({
    page,
  }) => {
    await page.evaluate(() =>
      Object.defineProperty(navigator, "canShare", {
        configurable: true,
        value: undefined,
      })
    )
    const trigger = page.getByRole("button", {
      name: item.trigger,
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: item.title, exact: true })
    const img = dialog.locator("img")
    await expect(img).toBeVisible()
    await expect(dialog.locator("header p")).toHaveText("2026年8月16日(日)")
    await expect
      .poll(() => img.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBe(1080)
    const geometry = await dialog.evaluate((element) => {
      const preview = element.querySelector(
        ".record-export-preview"
      ) as HTMLElement
      const image = preview.querySelector("img") as HTMLImageElement
      const start =
        image.getBoundingClientRect().top - preview.getBoundingClientRect().top
      preview.scrollTop = preview.scrollHeight
      const end =
        image.getBoundingClientRect().bottom -
        preview.getBoundingClientRect().bottom
      return {
        start,
        end,
        overflow: element.scrollWidth > element.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
      }
    })
    expect(geometry.overflow).toBe(false)
    expect(geometry.pageOverflow).toBe(false)
    expect(geometry.start).toBeGreaterThanOrEqual(-1)
    expect(geometry.end).toBeLessThanOrEqual(1)
    for (const button of [
      trigger,
      dialog.getByRole("button", { name: "閉じる" }),
      dialog.getByRole("button", { name: "共有する" }),
    ]) {
      await button.scrollIntoViewIfNeeded()
      const bounds = await button.boundingBox()
      expect(bounds?.width).toBeGreaterThanOrEqual(44)
      expect(bounds?.height).toBeGreaterThanOrEqual(44)
    }
    const download = page.waitForEvent("download")
    await dialog.getByRole("button", { name: "共有する" }).click()
    expect((await download).suggestedFilename()).toBe(item.filename)
    const src = await img.getAttribute("src")
    await dialog.getByRole("button", { name: "閉じる" }).click()
    await expect(dialog).not.toBeVisible()
    await trigger.click()
    await expect(dialog.locator("img")).toHaveAttribute("src", src ?? "")
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  })

  test(`${item.title}: 生成中は共有不可、失敗から再試行できる`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      const original = HTMLCanvasElement.prototype.toBlob
      let attempts = 0
      HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
        if (attempts++ === 0)
          document.addEventListener("fail-export", () => callback(null), {
            once: true,
          })
        else original.call(this, callback, type, quality)
      }
    })
    await page.getByRole("button", { name: item.trigger, exact: true }).click()
    const dialog = page.getByRole("dialog", { name: item.title, exact: true })
    await expect(dialog.getByText("画像を作成しています…")).toBeVisible()
    await expect(
      dialog.getByRole("button", { name: "共有する" })
    ).toBeDisabled()
    await page.evaluate(() => document.dispatchEvent(new Event("fail-export")))
    await expect(dialog.getByText("画像を作成できませんでした。")).toBeVisible()
    await dialog.getByRole("button", { name: "もう一度作る" }).click()
    await expect(dialog.locator("img")).toBeVisible()
    await expect(dialog.getByRole("button", { name: "共有する" })).toBeEnabled()
  })

  for (const outcome of ["success", "cancel", "error"] as const) {
    test(`${item.title}: 共有API ${outcome}`, async ({ page }) => {
      await page.evaluate((outcome) => {
        Object.defineProperty(navigator, "canShare", {
          configurable: true,
          value: () => true,
        })
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (data: ShareData) => {
            const file = data.files?.[0]
            document.body.dataset.sharedFile = JSON.stringify({
              name: file?.name,
              type: file?.type,
              size: file?.size,
              title: data.title,
            })
            if (outcome !== "success")
              throw new DOMException(
                "Share failed",
                outcome === "cancel" ? "AbortError" : "NotAllowedError"
              )
          },
        })
      }, outcome)
      const downloads: string[] = []
      page.on("download", (download) =>
        downloads.push(download.suggestedFilename())
      )
      await page
        .getByRole("button", { name: item.trigger, exact: true })
        .click()
      const share = page
        .getByRole("dialog")
        .getByRole("button", { name: "共有する" })
      await expect(share).toBeEnabled()
      await share.click()
      await expect(page.locator("body")).toHaveAttribute(
        "data-shared-file",
        /image\/png/
      )
      const data = JSON.parse(
        (await page.locator("body").getAttribute("data-shared-file")) ?? "{}"
      )
      expect(data).toMatchObject({
        name: item.filename,
        type: "image/png",
        title: item.title,
      })
      expect(data.size).toBeGreaterThan(0)
      if (outcome === "error")
        await expect.poll(() => downloads).toEqual([item.filename])
      else {
        // Flush asynchronous share rejection before asserting no fallback.
        await page.evaluate(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        )
        expect(downloads).toEqual([])
      }
    })
  }
}

test("長い種目名、大きい数値、多数のセットもPNG内に収まる", async ({
  page,
}) => {
  for (const count of [1, 3, 4, 100]) {
    const history = Array.from(
      { length: count === 100 ? 10 : 1 },
      (_, index) => ({
        date: "2026-09-08",
        category: "上半身",
        exercise:
          count === 4
            ? "長い種目名の折り返し確認BenchPress".repeat(8)
            : `種目 ${index + 1}`,
        weightKg: count === 4 ? 1234567890123 : 60,
        reps: count === 4 ? 1234567890123 : 8,
        setCount: count === 100 ? 10 : count,
      })
    )
    const rendered = await renderRecordInBrowser(page, history)
    expect(rendered.width).toBe(1080)
    expect(rendered.height).toBeGreaterThanOrEqual(1520)
    expect(
      rendered.draws.filter((draw) => /^SET \d+$/.test(draw.text))
    ).toHaveLength(count)
    for (const draw of rendered.draws) {
      expect(draw.left, draw.text).toBeGreaterThanOrEqual(84)
      expect(draw.right, draw.text).toBeLessThanOrEqual(996)
      expect(draw.top, draw.text).toBeGreaterThan(0)
      expect(draw.bottom, draw.text).toBeLessThan(rendered.height - 100)
    }
    const footer = rendered.draws.find((draw) => draw.text === "KIZM")
    const body = rendered.draws.filter(
      (draw) => draw.text !== "KIZM" && draw.text !== "#トレーニング記録"
    )
    expect(footer?.top).toBeGreaterThan(
      Math.max(...body.map((draw) => draw.bottom)) + 90
    )
    if (count === 100) expect(rendered.height).toBeGreaterThan(7000)
  }
})
