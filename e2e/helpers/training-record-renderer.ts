import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import type { Page } from "@playwright/test"
import ts from "typescript"
import type { WorkoutSet } from "../../lib/fitness/fitness"

// Load production drawing code into the real browser without a test-only route
// or production global. TypeScript is already a project dependency.
function browserBundle() {
  const modules = new Map<string, string>()
  function collect(file: string): string {
    if (modules.has(file)) return file
    modules.set(file, "")
    const output = ts
      .transpileModule(readFileSync(file, "utf8"), {
        compilerOptions: {
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2022,
        },
      })
      .outputText.replace(/require\("([^"]+)"\)/g, (_, name: string) => {
        const dependency = `${resolve(
          name.startsWith("@/") ? process.cwd() : dirname(file),
          name.replace(/^@\//, "")
        )}.ts`
        return `require(${JSON.stringify(collect(dependency))})`
      })
    modules.set(file, output)
    return file
  }
  const renderer = collect(
    resolve("components/training-record-image/training-record-image.ts")
  )
  const domain = collect(
    resolve("lib/fitness/training-record/training-record.ts")
  )
  return `(() => {
    const modules = {${[...modules].map(([file, source]) => `${JSON.stringify(file)}: (module, exports, require) => {${source}\n}`).join(",")}};
    const cache = {};
    const load = id => { if (!cache[id]) { const module = { exports: {} }; cache[id] = module; modules[id](module, module.exports, load); } return cache[id].exports; };
    window.renderRecordForTest = (history, date) => load(${JSON.stringify(renderer)}).renderTrainingRecord(load(${JSON.stringify(domain)}).getTrainingRecord(history, date));
  })()`
}

declare global {
  interface Window {
    renderRecordForTest: (
      history: WorkoutSet[],
      date: string
    ) => Promise<{ blob: Blob; height: number }>
  }
}

export async function renderRecordInBrowser(
  page: Page,
  history: WorkoutSet[],
  date = "2026-09-08"
) {
  await page.addScriptTag({ content: browserBundle() })
  return page.evaluate(
    async ({ history, date }) => {
      const draws: {
        text: string
        left: number
        right: number
        top: number
        bottom: number
      }[] = []
      const original = CanvasRenderingContext2D.prototype.fillText
      CanvasRenderingContext2D.prototype.fillText = function (
        text,
        x,
        y,
        maxWidth
      ) {
        const metrics = this.measureText(text)
        draws.push({
          text,
          left: x - metrics.actualBoundingBoxLeft,
          right: x + metrics.actualBoundingBoxRight,
          top: y - metrics.actualBoundingBoxAscent,
          bottom: y + metrics.actualBoundingBoxDescent,
        })
        original.call(this, text, x, y, maxWidth)
      }
      try {
        const result = await window.renderRecordForTest(history, date)
        const bitmap = await createImageBitmap(result.blob)
        const dimensions = { width: bitmap.width, height: bitmap.height }
        bitmap.close()
        return {
          ...dimensions,
          bytes: Array.from(new Uint8Array(await result.blob.arrayBuffer())),
          draws,
        }
      } finally {
        CanvasRenderingContext2D.prototype.fillText = original
      }
    },
    { history, date }
  )
}
