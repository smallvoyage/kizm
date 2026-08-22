# テスト運用

## E2E の役割分担

- `pnpm test:e2e:functional`: 操作 E2E。`@visual` を除外し、通常の `Chromium E2E` job で実行する。
- `pnpm test:e2e:visual`: visual regression。`@visual` だけを Linux で実行する。

GitHub Actions では `.github/workflows/ci.yml` と
`.github/workflows/visual-regression.yml` を分けているため、操作 E2E と visual
regression の成否は PR 上で独立して確認できる。

## Visual baseline の基準環境

baseline の正本は Linux 用だけとし、macOS 用 baseline は管理しない。
実行環境は
`mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e`、
テストランナーは `@playwright/test` 1.62.1 に固定する。Playwright を更新するときは
`package.json`、lockfile、workflow とこの文書のコンテナタグ・digest を同時に更新し、
すべての baseline を作り直す。

`pnpm test:e2e:visual` と `pnpm test:e2e:visual:update` は Linux 以外では失敗する。
ローカルでは次の固定コンテナから実行する。

```sh
docker run --rm --ipc=host \
  --user "$(id -u):$(id -g)" \
  -e CI=1 \
  -e HOME=/tmp \
  -e PNPM_HOME=/tmp/pnpm-home \
  -v "$PWD:/work" \
  -w /work \
  mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e \
  bash -lc 'npm install --global --prefix "$PNPM_HOME" pnpm@10.33.0 && export PATH="$PNPM_HOME/bin:$PATH" && pnpm install --store-dir /tmp/pnpm-store --frozen-lockfile && pnpm test:e2e:visual'
```

## Baseline の更新と目視確認

1. 上記コマンド末尾の `pnpm test:e2e:visual` を
   `pnpm test:e2e:visual:update` に置き換えて Linux baseline を生成する。
2. `e2e/visual-regression.spec.ts-snapshots/` の変更画像をすべて開き、320px、
   390px、身体組成の各指標で、意図した表示だけが変化していることを確認する。
3. 更新後に通常の `pnpm test:e2e:visual` を同じコンテナで再実行し、baseline
   と一致することを確認する。
4. spec の変更と baseline を同じ PR に含め、レビュー時にも画像を目視確認する。

意図しない差分がある場合は baseline を更新せず、実装または fixture の原因を修正する。

## CI 失敗時の確認

`Linux visual regression` が失敗すると、GitHub Actions の run に
`visual-regression-failure-<run id>-<attempt>` artifact が14日間保存される。
artifact には次を含む。

- `test-results/`: expected、actual、diff 画像と `trace.zip`
- `playwright-report/`: HTML report

HTML report は展開後に `pnpm exec playwright show-report <展開先>` で開く。
trace は `pnpm exec playwright show-trace <trace.zip>` で確認する。
