"use client"

import { CircleAlert, Dumbbell, LoaderCircle, Share2, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import type { WorkoutSet } from "@/lib/fitness"
import { getTrainingRecord } from "@/lib/fitness/training-record/training-record"
import { formatExportDate } from "./export-image/export-image-canvas"
import { exportImageStyle } from "./export-image/export-image-style"
import { renderTrainingRecord } from "./training-record-image/training-record-image"

type ExportState = "idle" | "rendering" | "ready" | "error"
type PreviewImage = { blob: Blob; height: number; url: string }

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
  const record = getTrainingRecord(workoutHistory, date)

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview]
  )

  const generate = async () => {
    setState("rendering")
    try {
      const rendered = await renderTrainingRecord(record)
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
