import { RequestTimeoutError } from "@notionhq/client"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import { FitnessDataError } from "@/lib/fitness-data"
import { toFitnessDataError } from "@/lib/notion-errors"

describe("toFitnessDataError", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("Notion SDKエラーをcodeだけログに残して変換する", () => {
    const token = "secret-token"
    const cause = new RequestTimeoutError(`request failed: ${token}`)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const error = toFitnessDataError(cause, "Days")

    expect(error).toBeInstanceOf(FitnessDataError)
    expect(error.cause).toBe(cause)
    expect(consoleError).toHaveBeenCalledWith(
      "Notion Days API request failed",
      {
        code: "notionhq_client_request_timeout",
      }
    )
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(token)
  })

  it("予期しないエラーの内容をログに出さずに変換する", () => {
    const token = "secret-token"
    const cause = new Error(`unexpected: ${token}`)
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    const error = toFitnessDataError(cause, "Workouts")

    expect(error).toBeInstanceOf(FitnessDataError)
    expect(error.cause).toBe(cause)
    expect(consoleError).toHaveBeenCalledWith(
      "Unexpected error while loading Notion Workouts"
    )
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain(token)
  })

  it("ドメインエラーはログに出さずそのまま返す", () => {
    const cause = new FitnessDataError("schema error")
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(toFitnessDataError(cause, "Days")).toBe(cause)
    expect(consoleError).not.toHaveBeenCalled()
  })
})
