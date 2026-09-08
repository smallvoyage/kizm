"use client"

import {
  CircleAlert,
  ClipboardList,
  LoaderCircle,
  Share2,
  X,
} from "lucide-react"
import Image from "next/image"
import { useRef } from "react"

import { useImageExport } from "@/components/image-export/use-image-export"
import type { FitnessLog } from "@/lib/fitness"
import {
  getDailyExportLog,
  getExportDates,
} from "@/lib/fitness/image-export/image-export"
import { formatNumber } from "@/lib/format-number"

import {
  canvasToPng,
  drawExportFooter,
  drawExportHeader,
  drawExportRule,
  formatExportDate,
} from "./export-image/export-image-canvas"
import { exportImageStyle } from "./export-image/export-image-style"

const CARD_WIDTH = exportImageStyle.width
const CARD_HEIGHT = exportImageStyle.minHeight
const CARD_PADDING = exportImageStyle.padding

function formatValue(value: number | null, fractionDigits = 1) {
  return value === null
    ? "—"
    : formatNumber(value, { fractionDigits, fixed: true })
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
  context.fillStyle = exportImageStyle.colors.muted
  context.font = `${exportImageStyle.type.label} ${fontFamily}`
  context.fillText(label, CARD_PADDING, y)

  context.fillStyle = exportImageStyle.colors.ink
  context.font = `${exportImageStyle.type.value} ${fontFamily}`
  context.textAlign = "right"
  context.fillText(formatValue(value, fractionDigits), CARD_WIDTH - 166, y)

  context.fillStyle = exportImageStyle.colors.muted
  context.font = `${exportImageStyle.type.label} ${fontFamily}`
  context.textAlign = "left"
  context.fillText(unit, CARD_WIDTH - 146, y)
}

async function renderSummary(
  log: FitnessLog
): Promise<{ blob: Blob; height: number }> {
  await document.fonts.ready

  const canvas = document.createElement("canvas")
  canvas.width = CARD_WIDTH
  canvas.height = CARD_HEIGHT
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not available")

  const fontFamily = getComputedStyle(document.body).fontFamily
  drawExportHeader(context, "DAILY LOG", log.date, fontFamily, CARD_HEIGHT)

  context.fillStyle = exportImageStyle.colors.ink
  context.font = `${exportImageStyle.type.heading} ${fontFamily}`
  context.fillText("体組成", CARD_PADDING, 330)
  drawExportRule(context, 368)
  drawMetric(context, "体重", log.weight, "kg", 445, fontFamily)
  drawMetric(context, "体脂肪率", log.bodyFat, "%", 535, fontFamily)
  drawMetric(context, "筋肉量", log.muscleMass, "kg", 625, fontFamily)

  context.fillStyle = exportImageStyle.colors.ink
  context.font = `${exportImageStyle.type.heading} ${fontFamily}`
  context.fillText("カロリー・PFC", CARD_PADDING, 785)
  drawExportRule(context, 823)
  drawMetric(context, "カロリー", log.calories, "kcal", 900, fontFamily, 0)
  drawMetric(context, "たんぱく質", log.protein, "g", 990, fontFamily)
  drawMetric(context, "脂質", log.fat, "g", 1080, fontFamily)
  drawMetric(context, "炭水化物", log.carbs, "g", 1170, fontFamily)

  drawExportFooter(context, "#fitness #食事記録", fontFamily, 1290)
  const blob = await canvasToPng(canvas)

  return { blob, height: CARD_HEIGHT }
}

export function DailySummaryExport({ logs }: { logs: FitnessLog[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dates = getExportDates(logs)
  const { date, state, preview, generate } = useImageExport(
    dates[0] ?? "",
    "daily-summary",
    async (selectedDate) => {
      const log = getDailyExportLog(logs, selectedDate)
      if (!log) throw new Error("Record not found")
      return renderSummary(log)
    }
  )

  const open = () => {
    dialogRef.current?.showModal()
    requestAnimationFrame(() => dialogRef.current?.focus())
    if (state !== "ready" && state !== "rendering") void generate()
  }

  const download = () => {
    if (!preview) return
    const anchor = document.createElement("a")
    anchor.href = preview.url
    anchor.download = preview.filename
    anchor.click()
  }

  const share = async () => {
    if (!preview) return
    const file = new File([preview.blob], preview.filename, {
      type: "image/png",
    })
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
        aria-label="体組成・カロリー・PFCを画像化"
        onClick={open}
      >
        <ClipboardList aria-hidden="true" />
        <span>体組成・カロリー・PFCを画像化</span>
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
              <p>{formatExportDate(date)}</p>
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

          <div className="record-export-date">
            <label htmlFor="daily-summary-export-date">記録日</label>
            <select
              id="daily-summary-export-date"
              value={date}
              aria-describedby="daily-summary-export-date-note"
              onChange={(event) => void generate(event.target.value)}
            >
              {dates.map((value) => (
                <option key={value} value={value}>
                  {formatExportDate(value)}
                </option>
              ))}
            </select>
            <p id="daily-summary-export-date-note">
              読み込み済みの記録日から選べます
            </p>
          </div>

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
                alt={`${formatExportDate(preview.date)}の体組成とカロリー・PFCサマリー`}
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
