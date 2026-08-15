"use client"

import { Check, CircleAlert, LoaderCircle, Share2 } from "lucide-react"
import { useRef, useState } from "react"

import type { FitnessLog } from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"

type ExportState = "idle" | "loading" | "success" | "error"

const metrics: Array<{
  key: keyof Pick<FitnessLog, "weight" | "bodyFat" | "muscleMass" | "steps">
  label: string
  unit: string
  token: string
}> = [
  { key: "weight", label: "体重", unit: "kg", token: "--color-weight" },
  { key: "bodyFat", label: "体脂肪率", unit: "%", token: "--color-body-fat" },
  {
    key: "muscleMass",
    label: "筋肉量",
    unit: "kg",
    token: "--color-muscle-mass",
  },
  { key: "steps", label: "歩数", unit: "歩", token: "--color-accent" },
]

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function getToken(styles: CSSStyleDeclaration, name: string) {
  return styles.getPropertyValue(name).trim()
}

function drawCard(canvas: HTMLCanvasElement, log: FitnessLog) {
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not supported")

  const styles = getComputedStyle(document.documentElement)
  const color = (name: string) => getToken(styles, name)
  const bodyFont = getComputedStyle(document.body).fontFamily
  const displayFont = bodyFont
  const date = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${log.date}T00:00:00Z`))

  canvas.width = 1080
  canvas.height = 1350
  context.fillStyle = color("--color-paper")
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = color("--color-accent")
  context.fillRect(0, 0, 24, canvas.height)
  context.fillRect(80, 92, 72, 12)

  context.fillStyle = color("--color-ink")
  context.font = `700 76px ${displayFont}`
  context.fillText("MY FITNESS", 80, 200)
  context.font = `400 30px ${bodyFont}`
  context.fillStyle = color("--color-muted")
  context.fillText(date, 84, 258)

  context.font = `700 40px ${displayFont}`
  context.fillStyle = color("--color-ink")
  context.fillText("TODAY'S RECORD", 80, 370)

  metrics.forEach((metric, index) => {
    const x = index % 2 === 0 ? 80 : 560
    const y = index < 2 ? 420 : 730
    const value = log[metric.key]

    roundedRect(context, x, y, 440, 260, 36)
    context.fillStyle = color("--color-paper-2")
    context.fill()
    context.strokeStyle = color("--color-rule")
    context.lineWidth = 2
    context.stroke()

    context.fillStyle = color(metric.token)
    context.fillRect(x + 36, y + 38, 48, 8)
    context.font = `400 28px ${bodyFont}`
    context.fillStyle = color("--color-muted")
    context.fillText(metric.label, x + 36, y + 98)

    context.fillStyle = color("--color-ink")
    context.font = `700 70px ${displayFont}`
    context.fillText(
      value === null
        ? "—"
        : formatNumber(value, {
            fractionDigits: metric.key === "steps" ? 0 : 1,
          }),
      x + 36,
      y + 195
    )
    if (value !== null) {
      const valueWidth = context.measureText(
        formatNumber(value, {
          fractionDigits: metric.key === "steps" ? 0 : 1,
        })
      ).width
      context.font = `600 27px ${bodyFont}`
      context.fillStyle = color("--color-ink-2")
      context.fillText(metric.unit, x + 48 + valueWidth, y + 193)
    }
  })

  context.fillStyle = color("--color-ink")
  context.font = `700 32px ${displayFont}`
  context.fillText("FITNESS ANALYTICS", 80, 1195)
  context.font = `400 24px ${bodyFont}`
  context.fillStyle = color("--color-muted")
  context.fillText("Small records. Clear progress.", 80, 1240)
  context.fillStyle = color("--color-accent")
  context.beginPath()
  context.arc(960, 1208, 40, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = color("--color-accent-ink")
  context.lineWidth = 8
  context.beginPath()
  context.moveTo(940, 1208)
  context.lineTo(955, 1223)
  context.lineTo(982, 1192)
  context.stroke()
}

export function FitnessExport({ log }: { log: FitnessLog | null }) {
  const [state, setState] = useState<ExportState>("idle")
  const resetTimer = useRef<ReturnType<typeof setTimeout>>(null)

  async function exportImage() {
    if (!log || state === "loading") return
    if (resetTimer.current) clearTimeout(resetTimer.current)
    setState("loading")

    try {
      await document.fonts.ready
      const canvas = document.createElement("canvas")
      drawCard(canvas, log)
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (result) =>
            result ? resolve(result) : reject(new Error("Export failed")),
          "image/png"
        )
      )
      const fileName = `fitness-${log.date}.png`
      const file = new File([blob], fileName, { type: blob.type })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Fitness Analytics" })
      } else {
        const link = document.createElement("a")
        link.href = URL.createObjectURL(blob)
        link.download = fileName
        link.click()
        URL.revokeObjectURL(link.href)
      }
      setState("success")
    } catch (error: unknown) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setState("idle")
        return
      }
      setState("error")
    }

    resetTimer.current = setTimeout(() => setState("idle"), 2400)
  }

  const label =
    state === "loading"
      ? "画像を作成中"
      : state === "success"
        ? "保存しました"
        : state === "error"
          ? "もう一度試す"
          : "画像でシェア"
  const Icon =
    state === "loading"
      ? LoaderCircle
      : state === "success"
        ? Check
        : state === "error"
          ? CircleAlert
          : Share2

  return (
    <button
      type="button"
      className="fitness-export-button"
      data-state={state}
      disabled={!log || state === "loading"}
      onClick={exportImage}
      aria-label={log ? label : "画像にできる記録がありません"}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}
