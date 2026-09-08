import { readFile } from "node:fs/promises"

import { expect, test } from "@playwright/test"

declare global {
  interface Window {
    imageExportTest: {
      hold: boolean
      draws: string[][]
      pending: Array<(fail: boolean) => Promise<void>>
      finish: (index: number, fail?: boolean) => Promise<void>
      revoked: string[]
      shareMode: "unsupported" | "success" | "cancel" | "error"
      shared: string[]
    }
  }
}

const exports = [
  {
    title: "日次サマリー",
    trigger: "体組成・カロリー・PFCを画像化",
    prefix: "daily-summary",
    value: ["67.7"],
    height: 1520,
  },
  {
    title: "トレーニング記録",
    trigger: "トレーニング記録を画像化",
    prefix: "training-record",
    value: ["95", "6"],
    height: 1835,
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const state: Window["imageExportTest"] = {
      hold: false,
      draws: [],
      pending: [],
      revoked: [],
      shareMode: "unsupported",
      shared: [],
      finish(index, fail = false) {
        return this.pending[index](fail)
      },
    }
    window.imageExportTest = state
    const texts = new WeakMap<HTMLCanvasElement, string[]>()
    const fillText = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth
    ) {
      const values = texts.get(this.canvas) ?? []
      values.push(text)
      texts.set(this.canvas, values)
      if (maxWidth === undefined) fillText.call(this, text, x, y)
      else fillText.call(this, text, x, y, maxWidth)
    }
    const toBlob = HTMLCanvasElement.prototype.toBlob
    HTMLCanvasElement.prototype.toBlob = function (callback, type, quality) {
      state.draws.push(texts.get(this) ?? [])
      if (state.hold) {
        state.pending.push(
          (fail) =>
            new Promise<void>((resolve) => {
              const complete = (blob: Blob | null) => {
                callback(blob)
                resolve()
              }
              if (fail) complete(null)
              else toBlob.call(this, complete, type, quality)
            })
        )
      } else toBlob.call(this, callback, type, quality)
    }
    const revoke = URL.revokeObjectURL
    URL.revokeObjectURL = (url) => {
      state.revoked.push(url)
      revoke(url)
    }
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => state.shareMode !== "unsupported",
    })
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        state.shared.push(data.files?.[0]?.name ?? "")
        if (state.shareMode === "cancel")
          throw new DOMException("Cancelled", "AbortError")
        if (state.shareMode === "error") throw new Error("Share failed")
      },
    })
  })
  await page.goto("/")
})

for (const item of exports) {
  test(`${item.title}: 過去日の内容をPNG出力し、狭い画面でも操作できる`, async ({
    page,
  }, testInfo) => {
    await page.getByRole("button", { name: item.trigger, exact: true }).click()
    const dialog = page.getByRole("dialog", { name: item.title, exact: true })
    const date = dialog.getByRole("combobox", { name: "記録日" })
    const share = dialog.getByRole("button", { name: "共有する" })
    await expect(date).toHaveValue("2026-08-16")
    await expect(share).toBeEnabled()
    const oldUrl = await dialog.getByRole("img").getAttribute("src")
    await date.selectOption("2026-08-09")
    await expect(share).toBeEnabled()
    await expect(dialog.getByRole("img")).toHaveAttribute("alt", /2026年8月9日/)
    const draw = await page.evaluate(() => window.imageExportTest.draws.at(-1))
    expect(draw).toContain("2026年8月9日(日)")
    for (const value of item.value) expect(draw).toContain(value)
    expect(await page.evaluate(() => window.imageExportTest.revoked)).toContain(
      oldUrl
    )

    const downloadPromise = page.waitForEvent("download")
    await share.click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toBe(`${item.prefix}-2026-08-09.png`)
    const path = await download.path()
    expect(path).not.toBeNull()
    const png = await readFile(path as string)
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
    )
    expect(png.readUInt32BE(16)).toBe(1080)
    expect(png.readUInt32BE(20)).toBe(item.height)

    for (const control of [
      date,
      share,
      dialog.getByRole("button", { name: "閉じる" }),
    ]) {
      await control.scrollIntoViewIfNeeded()
      await expect(control).toBeInViewport()
      const box = await control.boundingBox()
      expect(box?.height).toBeGreaterThanOrEqual(44)
      expect(box?.width).toBeGreaterThanOrEqual(44)
    }
    expect(
      await dialog.evaluate(
        (element) => element.scrollWidth <= element.clientWidth
      )
    ).toBe(true)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth
      )
    ).toBe(true)
    await date.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath(`${item.prefix}.png`) })
    await date.focus()
    await page.keyboard.press("Escape")
    await expect(dialog).not.toBeVisible()
    await page.getByRole("button", { name: item.trigger, exact: true }).click()
    await expect(date).toHaveValue("2026-08-09")
    await expect(share).toBeEnabled()
    await dialog.getByRole("button", { name: "閉じる" }).click()
    await expect(dialog).not.toBeVisible()
  })

  test(`${item.title}: 生成の競合、失敗と再試行、閉じた後の完了`, async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.imageExportTest.hold = true
    })
    const trigger = page.getByRole("button", {
      name: item.trigger,
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: item.title, exact: true })
    const date = dialog.getByRole("combobox", { name: "記録日" })
    const share = dialog.getByRole("button", { name: "共有する" })
    await expect
      .poll(() => page.evaluate(() => window.imageExportTest.pending.length))
      .toBe(1)
    await date.selectOption("2026-08-09")
    await expect(share).toBeDisabled()
    await expect(dialog.getByRole("img")).toHaveCount(0)
    await expect
      .poll(() => page.evaluate(() => window.imageExportTest.pending.length))
      .toBe(2)
    await page.evaluate(() => window.imageExportTest.finish(1))
    await expect(share).toBeEnabled()
    const selectedUrl = await dialog.getByRole("img").getAttribute("src")
    await page.evaluate(() => window.imageExportTest.finish(0))
    await expect(dialog.getByRole("img")).toHaveAttribute(
      "src",
      selectedUrl as string
    )

    await date.selectOption("2026-08-02")
    await expect
      .poll(() => page.evaluate(() => window.imageExportTest.pending.length))
      .toBe(3)
    await page.evaluate(() => window.imageExportTest.finish(2, true))
    await expect(dialog.getByText("画像を作成できませんでした。")).toBeVisible()
    await expect(share).toBeDisabled()
    await dialog.getByRole("button", { name: "もう一度作る" }).click()
    await expect
      .poll(() => page.evaluate(() => window.imageExportTest.pending.length))
      .toBe(4)
    await date.selectOption("2026-08-09")
    await expect
      .poll(() => page.evaluate(() => window.imageExportTest.pending.length))
      .toBe(5)
    await page.evaluate(() => window.imageExportTest.finish(4))
    await expect(share).toBeEnabled()
    await page.evaluate(() => window.imageExportTest.finish(3, true))
    await expect(share).toBeEnabled()
    await expect(dialog.getByRole("img")).toHaveAttribute("alt", /2026年8月9日/)

    await date.selectOption("2026-08-02")
    await expect
      .poll(() => page.evaluate(() => window.imageExportTest.pending.length))
      .toBe(6)
    await dialog.getByRole("button", { name: "閉じる" }).click()
    await page.evaluate(() => window.imageExportTest.finish(5))
    await expect(dialog).not.toBeVisible()
    await trigger.click()
    await expect(date).toHaveValue("2026-08-02")
    await expect(share).toBeEnabled()
  })

  test(`${item.title}: 同日の数値更新で旧画像を破棄する`, async ({ page }) => {
    const trigger = page.getByRole("button", {
      name: item.trigger,
      exact: true,
    })
    await trigger.click()
    const dialog = page.getByRole("dialog", { name: item.title, exact: true })
    await expect(dialog.getByRole("button", { name: "共有する" })).toBeEnabled()
    const oldUrl = await dialog.getByRole("img").getAttribute("src")
    await dialog.getByRole("button", { name: "閉じる" }).click()
    let changed = false
    await page.route("**/*", async (route) => {
      if (route.request().headers().rsc !== "1") return route.continue()
      const response = await route.fetch()
      const body = await response.text()
      // Replace both the serialized props and the content-based component key.
      const updated = body
        .replace(
          /(weight\\?":)67\.44/g,
          (_match, property: string) => `${property}66.44`
        )
        .replace(
          /(weightKg\\?":)100,/g,
          (_match, property: string) => `${property}105,`
        )
      changed ||= updated !== body
      await route.fulfill({ response, body: updated })
    })
    const refresh = page.getByRole("button", { name: "Notionのデータを更新" })
    await refresh.click()
    await expect.poll(() => changed).toBe(true)
    await expect(refresh).toBeEnabled()
    await trigger.click()
    await expect(dialog.getByRole("button", { name: "共有する" })).toBeEnabled()
    await expect(dialog.getByRole("combobox", { name: "記録日" })).toHaveValue(
      "2026-08-16"
    )
    expect(await page.evaluate(() => window.imageExportTest.revoked)).toContain(
      oldUrl
    )
    expect(
      await page.evaluate(() => window.imageExportTest.draws.at(-1))
    ).toContain(item.prefix === "daily-summary" ? "66.4" : "105")
  })

  test(`${item.title}: 共有成功・キャンセル・失敗の分岐`, async ({ page }) => {
    await page.getByRole("button", { name: item.trigger, exact: true }).click()
    const dialog = page.getByRole("dialog", { name: item.title, exact: true })
    await dialog
      .getByRole("combobox", { name: "記録日" })
      .selectOption("2026-08-09")
    const share = dialog.getByRole("button", { name: "共有する" })
    await expect(share).toBeEnabled()
    const downloads: string[] = []
    page.on("download", (download) =>
      downloads.push(download.suggestedFilename())
    )
    for (const mode of ["success", "cancel"] as const) {
      await page.evaluate((value) => {
        window.imageExportTest.shareMode = value
      }, mode)
      await share.click()
    }
    expect(await page.evaluate(() => window.imageExportTest.shared)).toEqual([
      `${item.prefix}-2026-08-09.png`,
      `${item.prefix}-2026-08-09.png`,
    ])
    expect(downloads).toEqual([])
    await page.evaluate(() => {
      window.imageExportTest.shareMode = "error"
    })
    const downloadPromise = page.waitForEvent("download")
    await share.click()
    expect((await downloadPromise).suggestedFilename()).toBe(
      `${item.prefix}-2026-08-09.png`
    )
  })
}
