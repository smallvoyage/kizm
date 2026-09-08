"use client"

import { CircleAlert, Dumbbell, LoaderCircle, Share2, X } from "lucide-react"
import Image from "next/image"
import { useRef } from "react"

import { useImageExport } from "@/components/image-export/use-image-export"
import type { WorkoutSet } from "@/lib/fitness"
import { getExportDates } from "@/lib/fitness/image-export/image-export"
import { getTrainingRecord } from "@/lib/fitness/training-record/training-record"
import { formatExportDate } from "./export-image/export-image-canvas"
import { exportImageStyle } from "./export-image/export-image-style"
import { renderTrainingRecord } from "./training-record-image/training-record-image"

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
      const selectedRecord = getTrainingRecord(workoutHistory, selectedDate)
      if (!selectedRecord.groups.length) throw new Error("Record not found")
      return renderTrainingRecord(selectedRecord)
    }
  )
  const record = getTrainingRecord(workoutHistory, date)

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
            <label htmlFor="training-record-export-date">記録日</label>
            <select
              id="training-record-export-date"
              value={date}
              aria-describedby="training-record-export-date-note"
              onChange={(event) => void generate(event.target.value)}
            >
              {dates.map((value) => (
                <option key={value} value={value}>
                  {formatExportDate(value)}
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
                alt={`${formatExportDate(date)}のトレーニング記録。${record.setCount}セット。`}
                width={exportImageStyle.width}
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
