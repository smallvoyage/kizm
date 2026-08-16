import { afterEach, describe, expect, it, vi } from "vitest"

const { clientConstructor } = vi.hoisted(() => ({
  clientConstructor: vi.fn(function MockNotionClient() {}),
}))

vi.mock("server-only", () => ({}))
vi.mock("@notionhq/client", () => ({ Client: clientConstructor }))

import { FitnessDataError } from "@/lib/fitness-data"
import { createNotionClient } from "@/lib/notion-client"

describe("createNotionClient", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    clientConstructor.mockClear()
  })

  it("環境変数のトークンと固定APIバージョンでClientを生成する", () => {
    vi.stubEnv("NOTION_TOKEN", "  secret-token  ")

    createNotionClient()

    expect(clientConstructor).toHaveBeenCalledOnce()
    expect(clientConstructor).toHaveBeenCalledWith({
      auth: "secret-token",
      notionVersion: "2026-03-11",
    })
  })

  it("トークンが未設定ならClientを生成しない", () => {
    vi.stubEnv("NOTION_TOKEN", " ")

    expect(() => createNotionClient()).toThrow(FitnessDataError)
    expect(clientConstructor).not.toHaveBeenCalled()
  })
})
