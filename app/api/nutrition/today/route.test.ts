import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ getDay: vi.fn() }))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/fitness-data-source", () => ({ fitnessDataSource: mocks }))

import { GET } from "./route"

const record = {
  date: "2026-09-19",
  calories: 1450,
  protein: 85,
  fat: 40,
  carbs: 150,
  steps: null,
  weight: null,
  bodyFat: null,
  muscleMass: null,
}
function request(authorization = "Bearer test-secret") {
  return new Request("https://kizm.example/api/nutrition/today", {
    headers: { authorization },
  })
}

describe("GET /api/nutrition/today", () => {
  beforeEach(() => {
    vi.stubEnv("KIZM_SHORTCUT_TOKEN", "test-secret")
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-09-19T09:35:00Z"))
    mocks.getDay.mockResolvedValue(record)
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.resetAllMocks()
  })

  it.each(["", "Bearer wrong", "Basic test-secret"])(
    "不正な認証ではデータ取得しない (%s)",
    async (authorization) => {
      const response = await GET(request(authorization))
      expect(response.status).toBe(401)
      expect(response.headers.get("Cache-Control")).toBe("private, no-store")
      expect(mocks.getDay).not.toHaveBeenCalled()
    }
  )
  it("認証ヘッダーがなければ拒否する", async () => {
    expect(
      (
        await GET(
          new Request(
            "https://kizm.example/api/nutrition/today?token=test-secret"
          )
        )
      ).status
    ).toBe(401)
    expect(mocks.getDay).not.toHaveBeenCalled()
  })
  it("設定が空の場合は公開しない", async () => {
    vi.stubEnv("KIZM_SHORTCUT_TOKEN", " ")
    expect((await GET(request())).status).toBe(503)
    expect(mocks.getDay).not.toHaveBeenCalled()
  })
  it("日本時間の今日の値と表示文を返し、毎回取得する", async () => {
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    const body = await response.json()
    expect(body).toMatchObject({
      date: "2026-09-19",
      status: "complete",
      fetchedAt: "2026-09-19T09:35:00.000Z",
      metrics: { calories: { consumed: 1450, goal: 1800, remaining: 350 } },
    })
    expect(body.displayText).toContain("残り 350 kcal")
    mocks.getDay.mockResolvedValue({ ...record, calories: 1600 })
    expect(
      (await (await GET(request())).json()).metrics.calories.consumed
    ).toBe(1600)
    expect(mocks.getDay).toHaveBeenCalledTimes(2)
    expect(mocks.getDay).toHaveBeenCalledWith("2026-09-19")
  })
  it("当日データがないことを正常結果として返す", async () => {
    mocks.getDay.mockResolvedValue(null)
    const response = await GET(request())
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      status: "empty",
      displayText: expect.stringContaining("今日はまだ記録がありません"),
    })
  })
  it("取得中の日付変更時は翌日の記録を再取得する", async () => {
    vi.setSystemTime(new Date("2026-09-19T14:59:59Z"))
    mocks.getDay
      .mockImplementationOnce(async () => {
        vi.setSystemTime(new Date("2026-09-19T15:00:01Z"))
        return record
      })
      .mockResolvedValueOnce(null)
    const body = await (await GET(request())).json()
    expect(mocks.getDay).toHaveBeenNthCalledWith(2, "2026-09-20")
    expect(body).toMatchObject({ date: "2026-09-20", status: "empty" })
  })
  it("取得エラーは秘密情報を含まないメッセージを返す", async () => {
    mocks.getDay.mockRejectedValue(new Error("secret upstream details"))
    const response = await GET(request())
    expect(response.status).toBe(502)
    expect(response.headers.get("Cache-Control")).toBe("private, no-store")
    const body = await response.json()
    expect(body.error).toBe("data_unavailable")
    expect(body.displayText).toContain("再実行")
    expect(JSON.stringify(body)).not.toContain("secret")
  })
})
