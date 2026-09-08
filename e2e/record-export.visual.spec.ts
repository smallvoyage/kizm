import { expect, test } from "@playwright/test"
import { renderRecordInBrowser } from "./helpers/training-record-renderer"

test(
  "画像化ダイアログとPNGの見た目",
  { tag: "@visual" },
  async ({ page }, testInfo) => {
    test.skip(
      !["chromium-320", "chromium-390"].includes(testInfo.project.name),
      "Mobile export baselines only"
    )
    await page.goto("/")
    for (const item of [
      { name: "daily", trigger: "体組成・カロリー・PFCを画像化" },
      { name: "training", trigger: "トレーニング記録を画像化" },
    ]) {
      await page
        .getByRole("button", { name: item.trigger, exact: true })
        .click()
      const dialog = page.getByRole("dialog")
      const img = dialog.locator("img")
      await expect(img).toBeVisible()
      await img.evaluate((image: HTMLImageElement) => image.decode())
      await expect(dialog).toHaveScreenshot(`${item.name}-dialog.png`)
      const bytes = await img.evaluate(async (image: HTMLImageElement) =>
        Array.from(new Uint8Array(await (await fetch(image.src)).arrayBuffer()))
      )
      if (testInfo.project.name === "chromium-390")
        expect(Buffer.from(bytes)).toMatchSnapshot(`${item.name}-png.png`)
      await dialog.getByRole("button", { name: "閉じる" }).click()
    }
  }
)

test(
  "折り返す種目名と複数行の数値",
  { tag: "@visual" },
  async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-390",
      "PNG is viewport independent"
    )
    await page.goto("/")
    const rendered = await renderRecordInBrowser(page, [
      {
        date: "2026-09-08",
        exercise: "長い種目名の折り返し確認BenchPress".repeat(4),
        category: "上半身",
        weightKg: 1234567890123,
        reps: 1234567890123,
        setCount: 1,
      },
    ])
    expect(Buffer.from(rendered.bytes)).toMatchSnapshot(
      "training-wrapped-png.png"
    )
  }
)
