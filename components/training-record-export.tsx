"use client"

import { CircleAlert, Dumbbell, LoaderCircle, Share2, X } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"

import { useImageExport } from "@/components/image-export/use-image-export"

import type { WorkoutSet } from "@/lib/fitness"
import {
  getExportDates,
  getTrainingExportGroups,
  type WorkoutGroup,
} from "@/lib/fitness/image-export/image-export"
import { formatNumber } from "@/lib/format-number"

type RenderedRecord = { blob: Blob; height: number }

const CARD_WIDTH = 1080
const MIN_CARD_HEIGHT = 1350
const CARD_PADDING = 72
const CONTENT_PANEL_TOP = 298
const CONTENT_TOP = 356
const CONTENT_PANEL_BOTTOM_PADDING = 28
const FOOTER_HEIGHT = 142
const EXERCISE_HEADER_HEIGHT = 64
const SET_LINE_HEIGHT = 54
const SET_COLUMNS = 3

function formatDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`))
}

function getGroupHeight(group: WorkoutGroup) {
  return (
    EXERCISE_HEADER_HEIGHT +
    Math.ceil(group.sets.length / SET_COLUMNS) * SET_LINE_HEIGHT
  )
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
}

function setFittedFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontFamily: string
) {
  let fontSize = 32
  context.font = `700 ${fontSize}px ${fontFamily}`
  while (fontSize > 18 && context.measureText(text).width > maxWidth) {
    fontSize -= 1
    context.font = `700 ${fontSize}px ${fontFamily}`
  }
}

function setFittedSetFont(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontFamily: string
) {
  let fontSize = 23
  context.font = `600 ${fontSize}px ${fontFamily}`
  while (fontSize > 17 && context.measureText(text).width > maxWidth) {
    fontSize -= 1
    context.font = `600 ${fontSize}px ${fontFamily}`
  }
}

function getToken(styles: CSSStyleDeclaration, name: string) {
  return styles.getPropertyValue(name).trim()
}

async function renderRecord(
  groups: WorkoutGroup[],
  date: string
): Promise<RenderedRecord> {
  await document.fonts.ready

  const contentHeight = groups.reduce(
    (height, group) => height + getGroupHeight(group),
    0
  )
  const cardHeight = Math.max(
    MIN_CARD_HEIGHT,
    CONTENT_TOP + contentHeight + FOOTER_HEIGHT
  )
  const canvas = document.createElement("canvas")
  canvas.width = CARD_WIDTH
  canvas.height = cardHeight
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Canvas is not available")

  const styles = getComputedStyle(document.documentElement)
  const color = (name: string) => getToken(styles, name)
  const bodyFont = getComputedStyle(document.body).fontFamily

  context.fillStyle = color("--color-paper")
  context.fillRect(0, 0, CARD_WIDTH, cardHeight)

  context.fillStyle = color("--color-accent")
  roundedRect(context, CARD_PADDING, 76, 52, 12, 6)
  context.fill()

  context.fillStyle = color("--color-muted")
  context.font = `600 27px ${bodyFont}`
  context.fillText(formatDate(date), CARD_PADDING, 146)

  context.fillStyle = color("--color-ink")
  context.font = `700 72px ${bodyFont}`
  context.fillText("トレーニング記録", CARD_PADDING, 238)

  context.fillStyle = color("--color-paper-2")
  roundedRect(
    context,
    CARD_PADDING,
    CONTENT_PANEL_TOP,
    CARD_WIDTH - CARD_PADDING * 2,
    CONTENT_TOP -
      CONTENT_PANEL_TOP +
      contentHeight +
      CONTENT_PANEL_BOTTOM_PADDING,
    30
  )
  context.fill()

  let groupTop = CONTENT_TOP
  groups.forEach((group, groupIndex) => {
    if (groupIndex > 0) {
      context.fillStyle = color("--color-rule")
      context.fillRect(
        CARD_PADDING + 34,
        groupTop - 1,
        CARD_WIDTH - CARD_PADDING * 2 - 68,
        2
      )
    }

    context.fillStyle = color("--color-ink")
    setFittedFont(context, group.exercise, 820, bodyFont)
    context.fillText(group.exercise, CARD_PADDING + 34, groupTop + 40)

    const setsLeft = CARD_PADDING + 34
    const setColumnWidth = 284
    group.sets.forEach((set, setIndex) => {
      const column = setIndex % SET_COLUMNS
      const row = Math.floor(setIndex / SET_COLUMNS)
      const x = setsLeft + column * setColumnWidth
      const y = groupTop + EXERCISE_HEADER_HEIGHT + row * SET_LINE_HEIGHT

      context.fillStyle = color("--color-accent-soft")
      roundedRect(context, x, y, 256, 40, 12)
      context.fill()

      const setText = `${formatNumber(set.weightKg, { fractionDigits: 1 })} kg × ${formatNumber(set.reps)} 回`
      context.fillStyle = color("--color-ink-2")
      setFittedSetFont(
        context,
        setText,
        set.isEstimatedOneRepMaxRecord ? 148 : 228,
        bodyFont
      )
      context.fillText(setText, x + 14, y + 28)

      if (set.isEstimatedOneRepMaxRecord) {
        context.fillStyle = color("--color-success")
        roundedRect(context, x + 166, y + 6, 78, 28, 8)
        context.fill()

        context.fillStyle = color("--color-accent-ink")
        context.font = `700 17px ${bodyFont}`
        context.textAlign = "center"
        context.fillText("MAX RM", x + 205, y + 26)
        context.textAlign = "start"
      }
    })

    groupTop += getGroupHeight(group)
  })

  const footerY = cardHeight - 68
  context.fillStyle = color("--color-muted")
  context.font = `600 23px ${bodyFont}`
  context.fillText("KIZM", CARD_PADDING, footerY)
  context.textAlign = "right"
  context.fillText("#トレーニング記録", CARD_WIDTH - CARD_PADDING, footerY)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Image generation failed")),
      "image/png"
    )
  })

  return { blob, height: cardHeight }
}

export function TrainingRecordExport({
  workoutHistory,
}: {
  workoutHistory: WorkoutSet[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const dates = getExportDates(workoutHistory)
  const { date, state, preview, generate } = useImageExport(
    dates[0] ?? "",
    "training-record",
    async (selectedDate) => {
      const groups = getTrainingExportGroups(workoutHistory, selectedDate)
      if (!groups.length) throw new Error("Record not found")
      return renderRecord(groups, selectedDate)
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
      await navigator.share({ files: [file], title: "トレーニング記録" })
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
        aria-label="トレーニング記録を画像化"
        onClick={open}
      >
        <Dumbbell aria-hidden="true" />
        <span>トレーニング記録を画像化</span>
      </button>
      <dialog
        ref={dialogRef}
        className="record-export-dialog"
        aria-labelledby="record-export-title"
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
              <h2 id="record-export-title">トレーニング記録</h2>
              <p>{formatShortDate(date)}</p>
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
            <label htmlFor="training-record-export-date">記録日</label>
            <select
              id="training-record-export-date"
              value={date}
              aria-describedby="training-record-export-date-note"
              onChange={(event) => void generate(event.target.value)}
            >
              {dates.map((value) => (
                <option key={value} value={value}>
                  {formatDate(value)}
                </option>
              ))}
            </select>
            <p id="training-record-export-date-note">
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
                alt={`${formatDate(preview.date)}のトレーニング記録。`}
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
