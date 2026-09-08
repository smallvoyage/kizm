"use client"

import { useEffect, useRef, useState } from "react"

type PreviewImage = {
  blob: Blob
  height: number
  url: string
  date: string
  filename: string
}

export function useImageExport(
  initialDate: string,
  prefix: string,
  render: (date: string) => Promise<{ blob: Blob; height: number }>
) {
  const [date, setDate] = useState(initialDate)
  const [state, setState] = useState<"idle" | "rendering" | "ready" | "error">(
    "idle"
  )
  const [preview, setPreview] = useState<PreviewImage | null>(null)
  const generation = useRef(0)
  const previewUrl = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      generation.current += 1
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
      previewUrl.current = null
    }
  }, [])

  const generate = async (targetDate = date) => {
    const id = ++generation.current
    setDate(targetDate)
    setState("rendering")
    setPreview(null)
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = null
    try {
      const rendered = await render(targetDate)
      if (id !== generation.current) return
      const url = URL.createObjectURL(rendered.blob)
      previewUrl.current = url
      setPreview({
        ...rendered,
        url,
        date: targetDate,
        filename: `${prefix}-${targetDate}.png`,
      })
      setState("ready")
    } catch {
      if (id === generation.current) setState("error")
    }
  }

  return { date, state, preview, generate }
}
