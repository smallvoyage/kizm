import { describe, expect, test, vi } from "vitest"

import { BOOTSTRAP_STEPS, runBootstrap } from "./bootstrap.mjs"

type RunOptions = {
  env: Record<string, string | undefined>
  stdio: "inherit"
}

function createRunner(statuses: number[] = []) {
  const calls: Array<{
    command: string
    args: string[]
    options: RunOptions
  }> = []
  const runCommand = (command: string, args: string[], options: RunOptions) => {
    calls.push({ command, args, options })
    return { status: statuses[calls.length - 1] ?? 0 }
  }

  return { calls, runCommand }
}

describe("runBootstrap", () => {
  test("frozen lockfileで依存関係とChromiumを導入してfixture doctorを実行する", () => {
    const { calls, runCommand } = createRunner()

    const exitCode = runBootstrap({
      environment: { NOTION_TOKEN: "" },
      output: { log: vi.fn(), error: vi.fn() },
      runCommand,
    })

    expect(exitCode).toBe(0)
    expect(calls.map(({ args }) => args)).toEqual(
      BOOTSTRAP_STEPS.map(({ args }) => args)
    )
    expect(calls[0]?.args).toEqual(["install", "--frozen-lockfile"])
    expect(calls.at(-1)?.options.env).toMatchObject({
      FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
      FITNESS_DATA_SOURCE: "fixture",
    })
  })

  test("失敗した工程の終了コードを返して後続工程を実行しない", () => {
    const { calls, runCommand } = createRunner([0, 8])
    const error = vi.fn()

    const exitCode = runBootstrap({
      output: { log: vi.fn(), error },
      runCommand,
    })

    expect(exitCode).toBe(8)
    expect(calls).toHaveLength(2)
    expect(error).toHaveBeenCalledWith(
      "[bootstrap] FAILED Playwright Chromium (exit code 8)"
    )
  })
})
