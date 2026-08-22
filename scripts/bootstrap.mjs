import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const FIXTURE_ENVIRONMENT = {
  FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
  FITNESS_DATA_SOURCE: "fixture",
}

export const BOOTSTRAP_STEPS = [
  {
    label: "依存関係",
    args: ["install", "--frozen-lockfile"],
  },
  {
    label: "Playwright Chromium",
    args: ["exec", "playwright", "install", "chromium"],
  },
  {
    label: "doctor",
    args: ["run", "doctor"],
    fixture: true,
  },
]

/**
 * @typedef {(command: string, args: string[], options: {
 *   env: Record<string, string | undefined>,
 *   stdio: "inherit"
 * }) => { error?: Error, status: number | null }} RunCommand
 */

/**
 * @param {{
 *   environment?: Record<string, string | undefined>,
 *   runCommand?: RunCommand,
 *   output?: Pick<Console, "error" | "log">
 * }} options
 */
export function runBootstrap({
  environment = process.env,
  runCommand = (command, args, options) => spawnSync(command, args, options),
  output = console,
} = {}) {
  for (const [index, step] of BOOTSTRAP_STEPS.entries()) {
    output.log(
      `[bootstrap] ${index + 1}/${BOOTSTRAP_STEPS.length} ${step.label}`
    )

    const result = runCommand("pnpm", step.args, {
      env: {
        ...environment,
        ...(step.fixture ? FIXTURE_ENVIRONMENT : {}),
      },
      stdio: "inherit",
    })

    if (result.error) {
      output.error(`[bootstrap] FAILED ${step.label}: ${result.error.message}`)
      return 1
    }

    if (result.status !== 0) {
      const exitCode = result.status ?? 1
      output.error(`[bootstrap] FAILED ${step.label} (exit code ${exitCode})`)
      return exitCode
    }
  }

  output.log(
    `[bootstrap] PASSED ${BOOTSTRAP_STEPS.length}/${BOOTSTRAP_STEPS.length}`
  )
  return 0
}

function main() {
  process.exitCode = runBootstrap()
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
