# テスト運用

## E2E の役割分担

- `pnpm test:e2e:functional`: 操作 E2E。`@visual` を除外し、通常の `Chromium E2E` job で実行する。
- `pnpm test:e2e:visual`: visual regression。`@visual` だけを Linux で実行する。

GitHub Actions では `.github/workflows/ci.yml` と
`.github/workflows/visual-regression.yml` を分けているため、操作 E2E と visual
regression の成否は PR 上で独立して確認できる。

## main の required checks

`main` へ検証前の変更が入らないよう、次の GitHub Actions job を required status
check に設定する。required status check で指定する名前は workflow 名や job ID ではなく、
各 job の `name` と一致させる。

- `Verify`: `.github/workflows/ci.yml` の `pnpm verify`
- `Chromium E2E`: `.github/workflows/ci.yml` の fixture ベースの操作 E2E

job 名を変更すると required status check との対応が切れるため、変更する場合は ruleset
も同じ PR の merge 前に更新する。同じ job 名を別 workflow で再利用しない。

### Ruleset の設定手順

private repository で ruleset または branch protection を使用するには GitHub Pro、Team、
Enterprise Cloud のいずれかが必要。GitHub Free のまま使用する場合は repository を public
にする必要がある。利用可能な状態にした後、repository の管理者が次の手順で設定する。

1. この workflow を含む PR で `Verify` と `Chromium E2E` を一度実行し、両方が成功することを確認する。
2. GitHub の **Settings > Rules > Rulesets** から branch ruleset を作成する。
3. ruleset 名を `Protect main`、Enforcement status を `Active` にする。
4. Target branches で `Include default branch` を選択する。
5. `Require status checks to pass` を有効にし、`Verify` と `Chromium E2E` を追加する。
6. `Require branches to be up to date before merging` は有効にしない。必要になった場合は、CI の再実行回数が増える影響を確認して別途有効にする。
7. bypass 対象を追加せずに ruleset を保存する。

設定後は **Settings > Rules > Rulesets > Protect main** で Enforcement status、対象 branch、
2件の required status check を確認する。CLI では次のコマンドで ruleset 一覧を取得し、
返された ID の詳細を確認できる。

```sh
gh api repos/watagit/kizm/rulesets
gh api repos/watagit/kizm/rulesets/<ruleset-id>
```

最後に検証用 PR を作成し、どちらかの job が未完了または失敗している間は merge が拒否され、
両方の成功後だけ merge できることを確認する。

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
