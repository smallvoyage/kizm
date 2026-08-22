import { describe, expect, test, vi } from "vitest"

import { runVerification, VERIFY_STEPS } from "./verify.mjs"

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

describe("runVerification", () => {
  test("verifyの全工程を順番に1回ずつ実行する", () => {
    const { calls, runCommand } = createRunner()

    const exitCode = runVerification({
      environment: {},
      output: { log: vi.fn(), error: vi.fn() },
      runCommand,
    })

    expect(exitCode).toBe(0)
    expect(calls.map(({ args }) => args)).toEqual(
      VERIFY_STEPS.map(({ args }) => args)
    )
  })

  test("失敗した工程名と終了コードを返し、後続工程を実行しない", () => {
    const { calls, runCommand } = createRunner([0, 0, 0, 9])
    const error = vi.fn()

    const exitCode = runVerification({
      environment: {},
      output: { log: vi.fn(), error },
      runCommand,
    })

    expect(exitCode).toBe(9)
    expect(calls).toHaveLength(4)
    expect(error).toHaveBeenCalledWith(
      "[verify] FAILED typecheck (exit code 9)"
    )
  })

  test("verify:allはfixture buildを再利用して最後にE2Eを実行する", () => {
    const { calls, runCommand } = createRunner()

    const exitCode = runVerification({
      includeE2E: true,
      environment: { NOTION_TOKEN: "" },
      output: { log: vi.fn(), error: vi.fn() },
      runCommand,
    })

    const build = calls.at(-2)
    const e2e = calls.at(-1)

    expect(exitCode).toBe(0)
    expect(build?.args).toEqual(["build"])
    expect(build?.options.env).toMatchObject({
      FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
      FITNESS_DATA_SOURCE: "fixture",
    })
    expect(e2e?.args).toEqual(["test:e2e"])
    expect(e2e?.options.env).toMatchObject({
      FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
      FITNESS_DATA_SOURCE: "fixture",
      PLAYWRIGHT_REUSE_BUILD: "true",
    })
    expect(calls.filter(({ args }) => args[0] === "build")).toHaveLength(1)
  })
})
