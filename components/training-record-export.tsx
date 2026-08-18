"use client"

import { CircleAlert, ImageIcon, LoaderCircle, Share2, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import {
  getWorkoutSetsWithRecords,
  type WorkoutSet,
  type WorkoutSetWithRecord,
} from "@/lib/fitness"
import { formatNumber } from "@/lib/format-number"

type ExportState = "idle" | "rendering" | "ready" | "error"

type WorkoutGroup = {
  exercise: string
  sets: WorkoutSetWithRecord[]
}

type RenderedRecord = {
  blob: Blob
  height: number
}

type PreviewImage = RenderedRecord & {
  url: string
}

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

function groupWorkoutSets(workoutSets: WorkoutSetWithRecord[]) {
  const groups = new Map<string, WorkoutSetWithRecord[]>()

  for (const set of workoutSets) {
    const exerciseSets = groups.get(set.exercise) ?? []
    exerciseSets.push(set)
    groups.set(set.exercise, exerciseSets)
  }

  return [...groups].map(([exercise, sets]) => ({ exercise, sets }))
}

function expandWorkoutSets(workoutSets: WorkoutSetWithRecord[]) {
  return workoutSets.flatMap((set) =>
    Array.from({ length: set.setCount }, (_, index) => ({
      ...set,
      isEstimatedOneRepMaxRecord: index === 0 && set.isEstimatedOneRepMaxRecord,
    }))
  )
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
  workoutSets: WorkoutSetWithRecord[]
): Promise<RenderedRecord> {
  await document.fonts.ready

  const groups = groupWorkoutSets(workoutSets)
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
  const date = workoutSets[0]?.date ?? ""

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
  workoutSets,
  workoutHistory,
}: {
  workoutSets: WorkoutSet[]
  workoutHistory: WorkoutSet[]
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [state, setState] = useState<ExportState>("idle")
  const [preview, setPreview] = useState<PreviewImage | null>(null)
  const date = workoutSets[0]?.date ?? ""
  const workoutSetsWithRecords = getWorkoutSetsWithRecords(workoutHistory, date)
  const expandedWorkoutSets = expandWorkoutSets(workoutSetsWithRecords)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview]
  )

  const generate = async () => {
    setState("rendering")
    try {
      const rendered = await renderRecord(expandedWorkoutSets)
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

  const filename = `training-record-${date}.png`

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
      await navigator.share({ files: [file], title: "トレーニング記録" })
    } catch (error: unknown) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        download()
      }
    }
  }

  return (
    <>
      <button type="button" className="record-export-trigger" onClick={open}>
        <ImageIcon aria-hidden="true" />
        <span>記録を画像化</span>
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
                alt={`${formatDate(date)}のトレーニング記録。${expandedWorkoutSets.length}セット。`}
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
