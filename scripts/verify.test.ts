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

  test("verify:allは1回のfixture buildを再利用し、4シナリオの機能E2Eを実行する", () => {
    const { calls, runCommand } = createRunner()

    const exitCode = runVerification({
      includeE2E: true,
      environment: {
        NOTION_TOKEN: "",
        FITNESS_DATA_SOURCE: "notion",
        FITNESS_FIXTURE_SCENARIO: "empty",
        PLAYWRIGHT_VISUAL_REGRESSION: "true",
        PLAYWRIGHT_PORT: "4193",
      },
      output: { log: vi.fn(), error: vi.fn() },
      runCommand,
    })

    const build = calls[VERIFY_STEPS.length - 1]
    const e2eCalls = calls.slice(VERIFY_STEPS.length)

    expect(exitCode).toBe(0)
    expect(build?.args).toEqual(["build"])
    expect(build?.options.env).toMatchObject({
      FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
      FITNESS_DATA_SOURCE: "fixture",
      FITNESS_FIXTURE_SCENARIO: "normal",
    })
    expect(e2eCalls.map(({ args }) => args)).toEqual([
      ["test:e2e", "--grep-invert", "@visual"],
      ["test:e2e:empty"],
      ["test:e2e:all-error"],
      ["test:e2e:workouts-error"],
    ])
    for (const e2e of e2eCalls) {
      expect(e2e.options.env).toMatchObject({
        FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
        FITNESS_DATA_SOURCE: "fixture",
        FITNESS_FIXTURE_SCENARIO: "normal",
        PLAYWRIGHT_REUSE_BUILD: "true",
        PLAYWRIGHT_VISUAL_REGRESSION: "false",
        PLAYWRIGHT_PORT: "4193",
      })
    }
    expect(calls.filter(({ args }) => args[0] === "build")).toHaveLength(1)
  })

  test.each(["normal", "empty", "all-error", "workouts-error"])(
    "%sのE2E失敗時にシナリオ名と終了コードを返し、後続を実行しない",
    (scenario) => {
      const index = ["normal", "empty", "all-error", "workouts-error"].indexOf(
        scenario
      )
      const statuses = Array<number>(VERIFY_STEPS.length + index).fill(0)
      const { calls, runCommand } = createRunner([...statuses, 7])
      const error = vi.fn()

      expect(
        runVerification({
          includeE2E: true,
          environment: {},
          output: { log: vi.fn(), error },
          runCommand,
        })
      ).toBe(7)
      expect(calls).toHaveLength(statuses.length + 1)
      expect(error).toHaveBeenCalledWith(
        `[verify] FAILED E2E ${scenario} (exit code 7)`
      )
    }
  )
})
