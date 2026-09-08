import type { TrainingRecord } from "@/lib/fitness/training-record/training-record"
import { formatNumber } from "@/lib/format-number"
import {
  canvasToPng,
  drawExportFooter,
  drawExportHeader,
  drawExportRule,
} from "../export-image/export-image-canvas"
import { exportImageStyle as style } from "../export-image/export-image-style"

type TextRun = { text: string; font: string; color: string }
type TextPlacement = TextRun & { x: number; y: number }
const CONTENT_WIDTH = style.width - style.padding * 2
const VALUE_WIDTH = CONTENT_WIDTH - 180
const HEADING_LINE_HEIGHT = 42
const SET_LINE_HEIGHT = 58

function width(context: CanvasRenderingContext2D, run: TextRun) {
  context.font = run.font
  return context.measureText(run.text).width
}

// Wrap using the actual loaded font, including unbroken exercise names/numbers.
function wrap(
  context: CanvasRenderingContext2D,
  runs: TextRun[],
  maxWidth: number
) {
  const lines: TextRun[][] = []
  let line: TextRun[] = []
  let lineWidth = 0
  const segmenter = new Intl.Segmenter("ja", { granularity: "grapheme" })
  for (const run of runs) {
    for (const { segment } of segmenter.segment(run.text)) {
      const previous = line.at(-1)
      const sameStyle =
        previous?.font === run.font && previous.color === run.color
      const next = {
        ...run,
        text: sameStyle ? previous.text + segment : segment,
      }
      const nextWidth =
        lineWidth -
        (sameStyle ? width(context, previous) : 0) +
        width(context, next)
      if (segment === "\n" || (nextWidth > maxWidth && line.length > 0)) {
        lines.push(line)
        line = []
        lineWidth = 0
        if (segment === "\n") continue
      }
      const tail = line.at(-1)
      if (tail?.font === run.font && tail.color === run.color) {
        lineWidth -= width(context, tail)
        tail.text += segment
        lineWidth += width(context, tail)
      } else {
        const nextRun = { ...run, text: segment }
        line.push(nextRun)
        lineWidth += width(context, nextRun)
      }
    }
  }
  if (line.length > 0) lines.push(line)
  return lines.length > 0 ? lines : [[{ ...runs[0], text: "" }]]
}

function measureRecord(
  context: CanvasRenderingContext2D,
  record: TrainingRecord,
  font: string
) {
  const text: TextPlacement[] = []
  const rules: number[] = []
  const badges: { x: number; y: number; width: number; height: number }[] = []
  let contentBottom = 0
  const run = (
    text: string,
    type: keyof typeof style.type,
    color: string = style.colors.ink
  ): TextRun => ({ text, font: `${style.type[type]} ${font}`, color })
  const place = (item: TextRun, x: number, y: number) => {
    context.font = item.font
    contentBottom = Math.max(
      contentBottom,
      y + context.measureText(item.text).actualBoundingBoxDescent
    )
    text.push({ ...item, x, y })
  }
  let headingY = 330
  for (const group of record.groups) {
    const headingLines = wrap(
      context,
      [run(group.exercise, "heading")],
      CONTENT_WIDTH
    )
    for (const [index, line] of headingLines.entries()) {
      place(
        line[0] ?? run("", "heading"),
        style.padding,
        headingY + index * HEADING_LINE_HEIGHT
      )
    }
    const ruleY =
      headingY + (headingLines.length - 1) * HEADING_LINE_HEIGHT + 38
    rules.push(ruleY)
    let rowY = ruleY + 77
    for (const [index, set] of group.sets.entries()) {
      place(
        run(`SET ${index + 1}`, "label", style.colors.muted),
        style.padding,
        rowY
      )
      if (set.isEstimatedOneRepMaxRecord) {
        const badge = run("MAX RM", "recordBadge")
        badges.push({
          x: style.padding + 105,
          y: rowY - 25,
          width: width(context, badge) + 20,
          height: 32,
        })
        place(badge, style.padding + 115, rowY)
        contentBottom = Math.max(contentBottom, rowY + 8)
      }
      const weight = [
        run(formatNumber(set.weightKg, { fractionDigits: 1 }), "value"),
        run(" kg", "label", style.colors.muted),
      ]
      const reps = [
        run(formatNumber(set.reps), "value"),
        run(" 回", "label", style.colors.muted),
      ]
      const combined = [
        ...weight,
        run(" × ", "label", style.colors.muted),
        ...reps,
      ]
      const lines =
        combined.reduce((sum, item) => sum + width(context, item), 0) <=
        VALUE_WIDTH
          ? [combined]
          : [
              ...wrap(context, weight, VALUE_WIDTH),
              ...wrap(context, reps, VALUE_WIDTH),
            ]
      for (const [lineIndex, line] of lines.entries()) {
        let x =
          style.width -
          style.padding -
          line.reduce((sum, item) => sum + width(context, item), 0)
        for (const item of line) {
          place(item, x, rowY + lineIndex * SET_LINE_HEIGHT)
          x += width(context, item)
        }
      }
      rowY += lines.length * SET_LINE_HEIGHT
    }
    headingY = Math.max(contentBottom, rowY) + 24
  }
  const footerY = Math.max(1290, contentBottom + 90)
  return { text, rules, badges, footerY, height: Math.ceil(footerY + 230) }
}

export async function renderTrainingRecord(record: TrainingRecord) {
  await document.fonts.ready
  const font = getComputedStyle(document.body).fontFamily
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not available")
  const layout = measureRecord(context, record, font)
  canvas.width = style.width
  canvas.height = layout.height
  drawExportHeader(context, "TRAINING LOG", record.date, font, layout.height)
  for (const y of layout.rules) drawExportRule(context, y)
  context.fillStyle = style.colors.recordBackground
  for (const badge of layout.badges) {
    context.beginPath()
    context.roundRect(badge.x, badge.y, badge.width, badge.height, 6)
    context.fill()
  }
  for (const item of layout.text) {
    context.font = item.font
    context.fillStyle = item.color
    context.fillText(item.text, item.x, item.y)
  }
  drawExportFooter(context, "#トレーニング記録", font, layout.footerY)
  return { blob: await canvasToPng(canvas), height: layout.height }
}
