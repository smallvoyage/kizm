"use client"

import { Download, ImageIcon, Share2, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import type { FitnessLog } from "@/lib/fitness"

type ExportState = "idle" | "rendering" | "ready" | "error"

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1350

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatMetric(value: number | null, unit: string) {
  return value === null
    ? "—"
    : `${value.toLocaleString("ja-JP", { maximumFractionDigits: 1 })} ${unit}`
}

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
  context.fill()
}

async function renderRecord(log: FitnessLog) {
  await document.fonts.ready

  const canvas = document.createElement("canvas")
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not available")

  context.fillStyle = "#f3f6fb"
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  context.fillStyle = "#245ad6"
  roundedRect(context, 72, 72, 112, 112, 32)
  context.strokeStyle = "#ffffff"
  context.lineWidth = 12
  context.lineCap = "round"
  context.beginPath()
  context.moveTo(98, 132)
  context.lineTo(119, 132)
  context.lineTo(134, 105)
  context.lineTo(157, 150)
  context.lineTo(171, 125)
  context.stroke()

  context.fillStyle = "#18202d"
  context.font = '700 42px Inter, "LINE Seed JP", sans-serif'
  context.fillText("FITNESS RECORD", 214, 125)
  context.fillStyle = "#657084"
  context.font = '500 28px Inter, "LINE Seed JP", sans-serif'
  context.fillText("積み重ねを、次の一歩へ。", 214, 171)

  context.fillStyle = "#ffffff"
  roundedRect(context, 72, 246, 936, 958, 56)

  context.fillStyle = "#657084"
  context.font = '600 28px Inter, "LINE Seed JP", sans-serif'
  context.fillText(formatDate(log.date), 132, 326)
  context.fillStyle = "#18202d"
  context.font = '700 64px Inter, "LINE Seed JP", sans-serif'
  context.fillText("今日の記録", 132, 414)

  const steps = log.steps ?? 0
  const stepProgress = Math.min(steps / 10_000, 1)
  context.strokeStyle = "#e0e8f5"
  context.lineWidth = 34
  context.beginPath()
  context.arc(306, 638, 142, -Math.PI / 2, Math.PI * 1.5)
  context.stroke()
  context.strokeStyle = "#245ad6"
  context.beginPath()
  context.arc(
    306,
    638,
    142,
    -Math.PI / 2,
    -Math.PI / 2 + Math.PI * 2 * stepProgress
  )
  context.stroke()
  context.textAlign = "center"
  context.fillStyle = "#657084"
  context.font = '600 26px Inter, "LINE Seed JP", sans-serif'
  context.fillText("STEPS", 306, 609)
  context.fillStyle = "#18202d"
  context.font = '700 54px Inter, "LINE Seed JP", sans-serif'
  context.fillText(log.steps?.toLocaleString("ja-JP") ?? "—", 306, 676)
  context.fillStyle = "#657084"
  context.font = '500 23px Inter, "LINE Seed JP", sans-serif'
  context.fillText("歩", 306, 717)
  context.textAlign = "start"

  const metrics = [
    { label: "体重", value: formatMetric(log.weight, "kg"), color: "#245ad6" },
    {
      label: "体脂肪率",
      value: formatMetric(log.bodyFat, "%"),
      color: "#c34082",
    },
    {
      label: "筋肉量",
      value: formatMetric(log.muscleMass, "kg"),
      color: "#2a8b67",
    },
  ]

  metrics.forEach((metric, index) => {
    const y = 502 + index * 150
    context.fillStyle = "#f3f6fb"
    roundedRect(context, 520, y, 416, 118, 28)
    context.fillStyle = metric.color
    roundedRect(context, 550, y + 29, 10, 60, 5)
    context.fillStyle = "#657084"
    context.font = '600 23px Inter, "LINE Seed JP", sans-serif'
    context.fillText(metric.label, 586, y + 45)
    context.fillStyle = "#18202d"
    context.font = '700 35px Inter, "LINE Seed JP", sans-serif'
    context.fillText(metric.value, 586, y + 88)
  })

  context.fillStyle = "#e0e5ed"
  context.fillRect(132, 917, 804, 2)
  context.fillStyle = "#657084"
  context.font = '500 25px Inter, "LINE Seed JP", sans-serif'
  context.fillText("食事", 132, 986)
  const nutrition = [
    ["カロリー", formatMetric(log.calories, "kcal")],
    ["たんぱく質", formatMetric(log.protein, "g")],
    ["脂質", formatMetric(log.fat, "g")],
    ["炭水化物", formatMetric(log.carbs, "g")],
  ]
  nutrition.forEach(([label, value], index) => {
    const x = 132 + index * 201
    context.fillStyle = "#657084"
    context.font = '500 20px Inter, "LINE Seed JP", sans-serif'
    context.fillText(label, x, 1040)
    context.fillStyle = "#18202d"
    context.font = '700 27px Inter, "LINE Seed JP", sans-serif'
    context.fillText(value, x, 1085)
  })

  context.fillStyle = "#657084"
  context.font = '600 24px Inter, "LINE Seed JP", sans-serif'
  context.fillText("FITNESS ANALYTICS", 72, 1282)
  context.textAlign = "right"
  context.fillText("#トレーニング記録", 1008, 1282)

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image generation failed")),
      "image/png"
    )
  })
}

export function TrainingRecordExport({ log }: { log: FitnessLog }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<ExportState>("idle")
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageBlob, setImageBlob] = useState<Blob | null>(null)

  useEffect(
    () => () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    },
    [imageUrl]
  )

  const open = async () => {
    dialogRef.current?.showModal()
    if (state === "ready") return
    setState("rendering")
    try {
      const blob = await renderRecord(log)
      setImageBlob(blob)
      setImageUrl(URL.createObjectURL(blob))
      setState("ready")
    } catch {
      setState("error")
    }
  }

  const filename = `fitness-record-${log.date}.png`

  const download = () => {
    if (!imageUrl) return
    const anchor = document.createElement("a")
    anchor.href = imageUrl
    anchor.download = filename
    anchor.click()
  }

  const share = async () => {
    if (!imageBlob) return
    const file = new File([imageBlob], filename, { type: "image/png" })
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: "トレーニング記録" })
      return
    }
    download()
  }

  return (
    <>
      <button type="button" className="record-export-trigger" onClick={open}>
        <ImageIcon aria-hidden="true" />
        <span>画像にする</span>
      </button>
      <dialog ref={dialogRef} className="record-export-dialog">
        <div className="record-export-panel">
          <header>
            <div>
              <p className="record-export-eyebrow">SHARE YOUR PROGRESS</p>
              <h2>記録を画像にする</h2>
            </div>
            <button
              type="button"
              className="record-export-close"
              onClick={() => dialogRef.current?.close()}
              aria-label="閉じる"
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <div className="record-export-preview" aria-live="polite">
            {state === "rendering" && <p>画像を作成しています…</p>}
            {state === "error" && (
              <p>画像を作成できませんでした。もう一度お試しください。</p>
            )}
            {imageUrl && (
              <Image
                src={imageUrl}
                alt={`${formatDate(log.date)}のトレーニング記録`}
                width={CARD_WIDTH}
                height={CARD_HEIGHT}
                unoptimized
              />
            )}
          </div>

          <div className="record-export-actions">
            <button
              className="record-export-action"
              type="button"
              onClick={share}
              disabled={state !== "ready"}
            >
              <Share2 aria-hidden="true" />
              共有する
            </button>
            <button
              className="record-export-action"
              type="button"
              onClick={download}
              disabled={state !== "ready"}
            >
              <Download aria-hidden="true" />
              保存する
            </button>
          </div>
          <p className="record-export-note">
            1080 × 1350 px のPNG画像として書き出します
          </p>
        </div>
      </dialog>
    </>
  )
}
