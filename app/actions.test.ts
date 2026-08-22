import { describe, expect, it, vi } from "vitest"

const { updateTag } = vi.hoisted(() => ({ updateTag: vi.fn() }))

vi.mock("next/cache", () => ({ updateTag }))

import { FITNESS_LOGS_CACHE_TAG } from "@/lib/cache-tags"
import { refreshFitnessLogs } from "./actions"

describe("refreshFitnessLogs", () => {
  it("Notion adapterのDays cacheを即時無効化する", async () => {
    await refreshFitnessLogs()

    expect(updateTag).toHaveBeenCalledWith(FITNESS_LOGS_CACHE_TAG)
  })
})
