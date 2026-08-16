import assert from "node:assert/strict"
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { formatResults, getScriptBinaries, runDoctor } from "./doctor.mjs"

function createFixture({ installDependencies = true } = {}) {
  const rootDir = mkdtempSync(join(tmpdir(), "fitness-doctor-"))
  const packageJson = {
    packageManager: "pnpm@10.33.0",
    scripts: {
      dev: "next dev",
      check: "biome check . && tsc --noEmit",
      doctor: "node scripts/doctor.mjs",
    },
  }
  const lockfile = "lockfileVersion: '9.0'\n"

  writeFileSync(join(rootDir, ".node-version"), "24.19.0\n")
  writeFileSync(join(rootDir, "package.json"), JSON.stringify(packageJson))
  writeFileSync(join(rootDir, "pnpm-lock.yaml"), lockfile)

  if (installDependencies) {
    mkdirSync(join(rootDir, "node_modules", ".bin"), { recursive: true })
    mkdirSync(join(rootDir, "node_modules", ".pnpm"), { recursive: true })
    writeFileSync(join(rootDir, "node_modules", ".pnpm", "lock.yaml"), lockfile)

    for (const binary of ["biome", "next", "tsc"]) {
      const binaryPath = join(rootDir, "node_modules", ".bin", binary)
      writeFileSync(binaryPath, "#!/bin/sh\n")
      chmodSync(binaryPath, 0o755)
    }
  }

  return rootDir
}

function successfulPnpm(_command, args) {
  return args[0] === "--version"
    ? { status: 0, stdout: "10.33.0\n" }
    : { status: 0, stdout: "" }
}

test("package scriptsから主要バイナリを抽出する", () => {
  assert.deepEqual(
    getScriptBinaries({
      dev: "next dev",
      check: "NODE_ENV=test biome check . && tsc --noEmit",
      doctor: "node scripts/doctor.mjs",
    }),
    ["biome", "next", "tsc"]
  )
})

test("すべての検査に成功する", (t) => {
  const rootDir = createFixture()
  t.after(() => rmSync(rootDir, { recursive: true, force: true }))

  const results = runDoctor({
    rootDir,
    nodeVersion: "24.19.0",
    runCommand: successfulPnpm,
  })

  assert.equal(results.length, 5)
  assert.ok(results.every(({ ok }) => ok))
})

test("fresh worktreeではクラッシュせず修復方法を表示する", (t) => {
  const rootDir = createFixture({ installDependencies: false })
  t.after(() => rmSync(rootDir, { recursive: true, force: true }))

  const output = formatResults(
    runDoctor({
      rootDir,
      nodeVersion: "24.19.0",
      runCommand: successfulPnpm,
    })
  )

  assert.match(output, /依存関係がまだインストールされていません/)
  assert.match(output, /pnpm install --frozen-lockfile/)
})

test("バージョン・lockfile・依存コマンドの不整合をまとめて報告する", (t) => {
  const rootDir = createFixture()
  t.after(() => rmSync(rootDir, { recursive: true, force: true }))
  rmSync(join(rootDir, "node_modules", ".bin", "next"))
  writeFileSync(join(rootDir, "node_modules", ".pnpm", "lock.yaml"), "stale\n")

  const runCommand = (_command, args) =>
    args[0] === "--version"
      ? { status: 0, stdout: "9.0.0\n" }
      : { status: 1, stdout: "NOTION_TOKEN=secret-value" }
  const output = formatResults(
    runDoctor({ rootDir, nodeVersion: "20.0.0", runCommand })
  )

  assert.match(output, /期待値 24\.19\.0 \/ 実行値 20\.0\.0/)
  assert.match(output, /期待値 10\.33\.0 \/ 実行値 9\.0\.0/)
  assert.match(output, /不足: next/)
  assert.match(output, /pnpm-lock.yamlがpackage.jsonと一致していません/)
  assert.match(output, /node_modulesがpnpm-lock.yamlと一致していません/)
  assert.doesNotMatch(output, /secret-value/)
})
