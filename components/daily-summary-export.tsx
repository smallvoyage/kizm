"use client"

import { CircleAlert, ImageIcon, LoaderCircle, Share2, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import type { FitnessLog } from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"

type ExportState = "idle" | "rendering" | "ready" | "error"

type PreviewImage = {
  blob: Blob
  height: number
  url: string
}

const CARD_WIDTH = 1080
const CARD_HEIGHT = 1520
const CARD_PADDING = 86
const CONTENT_WIDTH = CARD_WIDTH - CARD_PADDING * 2

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatValue(value: number | null, fractionDigits = 1) {
  return value === null
    ? "—"
    : formatNumber(value, { fractionDigits, fixed: true })
}

function drawRule(context: CanvasRenderingContext2D, y: number) {
  context.fillStyle = "#d8d5ce"
  context.fillRect(CARD_PADDING, y, CONTENT_WIDTH, 2)
}

function drawMetric(
  context: CanvasRenderingContext2D,
  label: string,
  value: number | null,
  unit: string,
  y: number,
  fontFamily: string,
  fractionDigits = 1
) {
  context.fillStyle = "#77746d"
  context.font = `600 27px ${fontFamily}`
  context.fillText(label, CARD_PADDING, y)

  context.fillStyle = "#24231f"
  context.font = `700 52px ${fontFamily}`
  context.textAlign = "right"
  context.fillText(formatValue(value, fractionDigits), CARD_WIDTH - 166, y)

  context.fillStyle = "#77746d"
  context.font = `600 27px ${fontFamily}`
  context.textAlign = "left"
  context.fillText(unit, CARD_WIDTH - 146, y)
}

async function renderSummary(
  log: FitnessLog
): Promise<Omit<PreviewImage, "url">> {
  await document.fonts.ready

  const canvas = document.createElement("canvas")
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not available")

  const fontFamily = getComputedStyle(document.body).fontFamily
  context.fillStyle = "#fbfaf7"
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT)

  context.fillStyle = "#24231f"
  context.font = `700 72px ${fontFamily}`
  context.fillText("DAILY LOG", CARD_PADDING, 150)
  context.fillStyle = "#77746d"
  context.font = `600 29px ${fontFamily}`
  context.fillText(formatDate(log.date), CARD_PADDING, 205)

  context.fillStyle = "#24231f"
  context.font = `700 30px ${fontFamily}`
  context.fillText("体組成", CARD_PADDING, 330)
  drawRule(context, 368)
  drawMetric(context, "体重", log.weight, "kg", 445, fontFamily)
  drawMetric(context, "体脂肪率", log.bodyFat, "%", 535, fontFamily)
  drawMetric(context, "筋肉量", log.muscleMass, "kg", 625, fontFamily)

  context.fillStyle = "#24231f"
  context.font = `700 30px ${fontFamily}`
  context.fillText("カロリー・PFC", CARD_PADDING, 785)
  drawRule(context, 823)
  drawMetric(context, "カロリー", log.calories, "kcal", 900, fontFamily, 0)
  drawMetric(context, "たんぱく質", log.protein, "g", 990, fontFamily)
  drawMetric(context, "脂質", log.fat, "g", 1080, fontFamily)
  drawMetric(context, "炭水化物", log.carbs, "g", 1170, fontFamily)

  drawRule(context, 1290)
  context.fillStyle = "#aaa69e"
  context.font = `600 24px ${fontFamily}`
  context.fillText("Fitness Analytics", CARD_PADDING, 1360)
  context.textAlign = "right"
  context.fillText("#fitness #食事記録", CARD_WIDTH - CARD_PADDING, 1360)
  context.textAlign = "left"

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Image generation failed")),
      "image/png"
    )
  })

  return { blob, height: CARD_HEIGHT }
}

export function DailySummaryExport({ log }: { log: FitnessLog }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<ExportState>("idle")
  const [preview, setPreview] = useState<PreviewImage | null>(null)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview]
  )

  const generate = async () => {
    setState("rendering")
    try {
      const rendered = await renderSummary(log)
      const url = URL.createObjectURL(rendered.blob)
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current.url)
        return { ...rendered, url }
      })
      setState("ready")
    } catch {
      setState("error")
    }
  }

  const open = () => {
    dialogRef.current?.showModal()
    requestAnimationFrame(() => dialogRef.current?.focus())
    if (state !== "ready" && state !== "rendering") void generate()
  }

  const filename = `daily-summary-${log.date}.png`
  const download = () => {
    if (!preview) return
    const anchor = document.createElement("a")
    anchor.href = preview.url
    anchor.download = filename
    anchor.click()
  }

  const share = async () => {
    if (!preview) return
    const file = new File([preview.blob], filename, { type: "image/png" })
    if (!navigator.canShare?.({ files: [file] })) {
      download()
      return
    }

    try {
      await navigator.share({ files: [file], title: "日次サマリー" })
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        download()
      }
    }
  }

  return (
    <>
      <button
        type="button"
        className="record-export-trigger"
        aria-label="日次を画像化"
        onClick={open}
      >
        <ImageIcon aria-hidden="true" />
        <span>日次を画像化</span>
      </button>
      <dialog
        ref={dialogRef}
        className="record-export-dialog"
        aria-labelledby="daily-summary-export-title"
        tabIndex={-1}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.close()
        }}
      >
        <div className="record-export-panel">
          <header>
            <div className="record-export-heading">
              <h2 id="daily-summary-export-title">日次サマリー</h2>
              <p>{formatDate(log.date)}</p>
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

          <div
            className="record-export-preview"
            aria-live="polite"
            aria-busy={state === "rendering"}
          >
            {state === "rendering" && (
              <div className="record-export-status" data-state="loading">
                <LoaderCircle aria-hidden="true" />
                <p>画像を作成しています…</p>
              </div>
            )}
            {state === "error" && (
              <div className="record-export-status" data-state="error">
                <CircleAlert aria-hidden="true" />
                <p>画像を作成できませんでした。</p>
                <button type="button" onClick={() => void generate()}>
                  もう一度作る
                </button>
              </div>
            )}
            {preview && state === "ready" && (
              <Image
                src={preview.url}
                alt={`${formatDate(log.date)}の体組成とカロリー・PFCサマリー`}
                width={CARD_WIDTH}
                height={preview.height}
                unoptimized
              />
            )}
          </div>

          <div className="record-export-actions">
            <button
              className="record-export-action"
              type="button"
              onClick={() => void share()}
              disabled={state !== "ready"}
            >
              <Share2 aria-hidden="true" />
              共有する
            </button>
          </div>
          <p className="record-export-note">
            1080 px幅のPNG画像として書き出します
          </p>
        </div>
      </dialog>
    </>
  )
}
