"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useTransition } from "react"

const AUTO_REFRESH_INTERVAL_MS = 5_000

export function RefreshButton() {
  const router = useRouter()
  const lastRefreshAt = useRef(Date.now())
  const [isPending, startTransition] = useTransition()

  const refresh = useCallback(() => {
    const now = Date.now()
    if (isPending || now - lastRefreshAt.current < AUTO_REFRESH_INTERVAL_MS) {
      return
    }

    lastRefreshAt.current = now
    startTransition(() => {
      router.refresh()
    })
  }, [isPending, router])

  const refreshManually = () => {
    lastRefreshAt.current = 0
    refresh()
  }

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        refresh()
      }
    }

    window.addEventListener("focus", refreshWhenVisible)
    document.addEventListener("visibilitychange", refreshWhenVisible)

    return () => {
      window.removeEventListener("focus", refreshWhenVisible)
      document.removeEventListener("visibilitychange", refreshWhenVisible)
    }
  }, [refresh])

  const label = isPending ? "データを更新中" : "Notionのデータを更新"

  return (
    <>
      <button
        type="button"
        className="dashboard-refresh"
        onClick={refreshManually}
        disabled={isPending}
        aria-label={label}
        title={label}
        data-state={isPending ? "loading" : "default"}
      >
        <RefreshCw aria-hidden="true" />
      </button>
      <span className="sr-only" aria-live="polite">
        {isPending ? "データを更新しています" : ""}
      </span>
    </>
  )
}
