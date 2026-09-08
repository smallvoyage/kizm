import { spawnSync } from "node:child_process"
import { pathToFileURL } from "node:url"

const FIXTURE_ENVIRONMENT = {
  FITNESS_ALLOW_FIXTURE_IN_PRODUCTION: "true",
  FITNESS_DATA_SOURCE: "fixture",
  FITNESS_FIXTURE_SCENARIO: "normal",
}

export const VERIFY_STEPS = [
  { label: "check", args: ["check"] },
  { label: "unit", args: ["test:unit"] },
  { label: "next typegen", args: ["exec", "next", "typegen"] },
  { label: "typecheck", args: ["typecheck"] },
  { label: "knip", args: ["knip"] },
  { label: "build", args: ["build"], fixture: true },
]

const E2E_STEPS = [
  { label: "E2E normal", args: ["test:e2e", "--grep-invert", "@visual"] },
  { label: "E2E empty", args: ["test:e2e:empty"] },
  { label: "E2E all-error", args: ["test:e2e:all-error"] },
  { label: "E2E workouts-error", args: ["test:e2e:workouts-error"] },
].map((step) => ({ ...step, fixture: true, reuseBuild: true }))

/**
 * @typedef {(command: string, args: string[], options: {
 *   env: Record<string, string | undefined>,
 *   stdio: "inherit"
 * }) => { error?: Error, status: number | null }} RunCommand
 */

/**
 * @param {{
 *   includeE2E?: boolean,
 *   environment?: Record<string, string | undefined>,
 *   runCommand?: RunCommand,
 *   output?: Pick<Console, "error" | "log">
 * }} options
 */
export function runVerification({
  includeE2E = false,
  environment = process.env,
  runCommand = (command, args, options) => spawnSync(command, args, options),
  output = console,
} = {}) {
  const steps = includeE2E ? [...VERIFY_STEPS, ...E2E_STEPS] : VERIFY_STEPS

  for (const [index, step] of steps.entries()) {
    output.log(`[verify] ${index + 1}/${steps.length} ${step.label}`)

    const stepEnvironment = {
      ...environment,
      ...(step.fixture ? FIXTURE_ENVIRONMENT : {}),
      ...(step.reuseBuild
        ? {
            PLAYWRIGHT_REUSE_BUILD: "true",
            PLAYWRIGHT_VISUAL_REGRESSION: "false",
          }
        : {}),
    }
    const result = runCommand("pnpm", step.args, {
      env: stepEnvironment,
      stdio: "inherit",
    })

    if (result.error) {
      output.error(`[verify] FAILED ${step.label}: ${result.error.message}`)
      return 1
    }

    if (result.status !== 0) {
      const exitCode = result.status ?? 1
      output.error(`[verify] FAILED ${step.label} (exit code ${exitCode})`)
      return exitCode
    }
  }

  output.log(`[verify] PASSED ${steps.length}/${steps.length}`)
  return 0
}

function main() {
  const unknownArguments = process.argv
    .slice(2)
    .filter((arg) => arg !== "--all")

  if (unknownArguments.length > 0) {
    console.error(`Unknown argument: ${unknownArguments.join(" ")}`)
    process.exitCode = 1
    return
  }

  process.exitCode = runVerification({
    includeE2E: process.argv.includes("--all"),
  })
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
