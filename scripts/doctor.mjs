import { spawnSync } from "node:child_process"
import { accessSync, constants, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const IGNORED_SCRIPT_COMMANDS = new Set([
  "bash",
  "bun",
  "cd",
  "cmd",
  "echo",
  "export",
  "false",
  "node",
  "npm",
  "npx",
  "pnpm",
  "sh",
  "test",
  "true",
  "yarn",
])

function readText(path) {
  return readFileSync(path, "utf8").trim()
}

function readEnvironmentEntries(path) {
  try {
    return readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*export\s+/, "").trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.replace(/^(['"])(.*)\1$/, "$2")])
  } catch {
    return []
  }
}

function getEnvironmentFileEntries(rootDir) {
  const entries = new Map()

  for (const file of [".env", ".env.local"]) {
    for (const [key, value] of readEnvironmentEntries(resolve(rootDir, file))) {
      entries.set(key, value)
    }
  }

  return entries
}

export function getEnvironmentKeys({
  rootDir = process.cwd(),
  environment = process.env,
} = {}) {
  const exampleKeys = new Map(
    readEnvironmentEntries(resolve(rootDir, ".env.example"))
  )
  const environmentFileEntries = getEnvironmentFileEntries(rootDir)
  const configuredKeys = new Set([
    ...environmentFileEntries.keys(),
    ...Object.keys(environment),
  ])
  const dataSource =
    environment.FITNESS_DATA_SOURCE ??
    environmentFileEntries.get("FITNESS_DATA_SOURCE")
  const fixtureMode = dataSource?.trim() === "fixture"

  return {
    missing: [...exampleKeys.keys()]
      .filter((key) => key !== "FITNESS_ALLOW_FIXTURE_IN_PRODUCTION")
      .filter((key) => !fixtureMode || !key.startsWith("NOTION_"))
      .filter((key) => !configuredKeys.has(key)),
    fixtureMode,
  }
}

function getPnpmVersion(packageManager) {
  const match = /^pnpm@(.+)$/.exec(packageManager ?? "")
  return match?.[1] ?? null
}

export function getScriptBinaries(scripts = {}) {
  const binaries = new Set()

  for (const script of Object.values(scripts)) {
    for (const command of script.split(/&&|\|\||;|\|/)) {
      const words = command.trim().split(/\s+/)
      const executable = words.find(
        (word) => !/^[A-Za-z_][A-Za-z0-9_]*=/.test(word)
      )

      if (executable && !IGNORED_SCRIPT_COMMANDS.has(executable)) {
        binaries.add(executable)
      }
    }
  }

  return [...binaries].sort()
}

function result(label, ok, details, repair) {
  return { label, ok, details, repair }
}

export function runDoctor({
  rootDir = process.cwd(),
  nodeVersion = process.versions.node,
  runCommand = spawnSync,
  environment = process.env,
} = {}) {
  const results = []
  let packageJson
  let expectedNodeVersion

  try {
    packageJson = JSON.parse(readText(resolve(rootDir, "package.json")))
  } catch {
    return [
      result(
        "package.json",
        false,
        "package.jsonを読み取れません",
        "リポジトリのルートで実行し、package.jsonを復元してください"
      ),
    ]
  }

  try {
    expectedNodeVersion = readText(resolve(rootDir, ".node-version"))
    results.push(
      result(
        "Node",
        nodeVersion === expectedNodeVersion,
        `期待値 ${expectedNodeVersion} / 実行値 ${nodeVersion}`,
        `nodenv install ${expectedNodeVersion} を実行してNode.jsを切り替えてください`
      )
    )
  } catch {
    results.push(
      result(
        "Node",
        false,
        ".node-versionを読み取れません",
        ".node-versionを復元してください"
      )
    )
  }

  const expectedPnpmVersion = getPnpmVersion(packageJson.packageManager)
  const pnpm = runCommand("pnpm", ["--version"], {
    cwd: rootDir,
    encoding: "utf8",
    stdio: "pipe",
  })
  const actualPnpmVersion = pnpm.status === 0 ? pnpm.stdout.trim() : null

  results.push(
    result(
      "pnpm",
      expectedPnpmVersion !== null && actualPnpmVersion === expectedPnpmVersion,
      expectedPnpmVersion
        ? `期待値 ${expectedPnpmVersion} / 実行値 ${actualPnpmVersion ?? "利用不可"}`
        : "packageManagerにpnpmのバージョン指定がありません",
      expectedPnpmVersion
        ? `corepack prepare pnpm@${expectedPnpmVersion} --activate を実行してください`
        : "package.jsonのpackageManagerをpnpm@<version>形式で指定してください"
    )
  )

  const binaries = getScriptBinaries(packageJson.scripts)
  const missingBinaries = binaries.filter((binary) => {
    try {
      accessSync(
        resolve(rootDir, "node_modules", ".bin", binary),
        constants.X_OK
      )
      return false
    } catch {
      return true
    }
  })

  results.push(
    result(
      "依存コマンド",
      missingBinaries.length === 0,
      missingBinaries.length === 0
        ? `${binaries.join(", ")} を利用できます`
        : `不足: ${missingBinaries.join(", ")}`,
      "pnpm install --frozen-lockfile を実行してください"
    )
  )

  const environmentKeys = getEnvironmentKeys({ rootDir, environment })
  results.push(
    result(
      "環境変数",
      environmentKeys.missing.length === 0,
      environmentKeys.missing.length === 0
        ? environmentKeys.fixtureMode
          ? ".env.exampleのfixture用キーが設定されています"
          : ".env.exampleのキーが設定されています"
        : `不足: ${environmentKeys.missing.join(", ")}`,
      "`.env.example`を確認し、不足しているキーを環境変数または.env.localに設定してください"
    )
  )

  const frozenLockfile = runCommand(
    "pnpm",
    ["install", "--lockfile-only", "--frozen-lockfile", "--ignore-scripts"],
    { cwd: rootDir, encoding: "utf8", stdio: "pipe" }
  )
  results.push(
    result(
      "package.jsonとlockfile",
      frozenLockfile.status === 0,
      frozenLockfile.status === 0
        ? "pnpm-lock.yamlはpackage.jsonと一致しています"
        : "pnpm-lock.yamlがpackage.jsonと一致していません",
      "pnpm install --lockfile-only を実行し、更新されたpnpm-lock.yamlを確認してください"
    )
  )

  try {
    const lockfile = readFileSync(resolve(rootDir, "pnpm-lock.yaml"))
    const installedLockfile = readFileSync(
      resolve(rootDir, "node_modules", ".pnpm", "lock.yaml")
    )
    const installedMatches = lockfile.equals(installedLockfile)

    results.push(
      result(
        "インストール済み依存関係",
        installedMatches,
        installedMatches
          ? "node_modulesはpnpm-lock.yamlと一致しています"
          : "node_modulesがpnpm-lock.yamlと一致していません",
        "pnpm install --frozen-lockfile を実行してください"
      )
    )
  } catch {
    results.push(
      result(
        "インストール済み依存関係",
        false,
        "依存関係がまだインストールされていません",
        "pnpm install --frozen-lockfile を実行してください"
      )
    )
  }

  return results
}

export function formatResults(results) {
  const lines = results.map(
    ({ label, ok, details }) => `${ok ? "✓" : "✗"} ${label}: ${details}`
  )
  const repairs = [
    ...new Set(results.filter(({ ok }) => !ok).map(({ repair }) => repair)),
  ]

  if (repairs.length > 0) {
    lines.push("", "修復方法:", ...repairs.map((repair) => `- ${repair}`))
  }

  return lines.join("\n")
}

function main() {
  const results = runDoctor()
  console.log(formatResults(results))
  process.exitCode = results.every(({ ok }) => ok) ? 0 : 1
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main()
}
