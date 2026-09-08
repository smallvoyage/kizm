import { exportImageStyle as style } from "./export-image-style"

export function formatExportDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

export function drawExportHeader(
  context: CanvasRenderingContext2D,
  title: string,
  date: string,
  font: string,
  height: number
) {
  context.fillStyle = style.colors.paper
  context.fillRect(0, 0, style.width, height)
  context.textAlign = "left"
  context.fillStyle = style.colors.ink
  context.font = `${style.type.title} ${font}`
  context.fillText(title, style.padding, 150)
  context.fillStyle = style.colors.muted
  context.font = `${style.type.date} ${font}`
  context.fillText(formatExportDate(date), style.padding, 205)
}

export function drawExportRule(context: CanvasRenderingContext2D, y: number) {
  context.fillStyle = style.colors.rule
  context.fillRect(style.padding, y, style.width - style.padding * 2, 2)
}

export function drawExportFooter(
  context: CanvasRenderingContext2D,
  hashtag: string,
  font: string,
  ruleY: number
) {
  drawExportRule(context, ruleY)
  context.fillStyle = style.colors.footer
  context.font = `${style.type.footer} ${font}`
  context.textAlign = "left"
  context.fillText("KIZM", style.padding, ruleY + 70)
  context.textAlign = "right"
  context.fillText(hashtag, style.width - style.padding, ruleY + 70)
  context.textAlign = "left"
}

export function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image generation failed")),
      "image/png"
    )
  })
}
