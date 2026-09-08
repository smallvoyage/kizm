# テスト運用

この文書を、人間とCodexがfixtureとテストを追加・更新するときの共通ルールとする。
通常の開発・CIではNotionのsecretや実データに依存せず、決定論的なfixtureを使用する。

## Fixtureの選択

`FITNESS_DATA_SOURCE=fixture`を指定すると`lib/fixture/`のデータソースを使用する。
さらに`FITNESS_FIXTURE_SCENARIO`で次のシナリオを選ぶ。未指定時は`normal`になる。

| シナリオ | 用途 |
| --- | --- |
| `normal` | 固定日付の通常データ。通常表示、操作、集計の確認 |
| `empty` | DaysとWorkoutsがともに0件の空状態 |
| `missing-nutrition` | 栄養値が全部または一部未入力の状態。`null`は0ではなく未入力を表す |
| `workouts-error` | Daysは成功し、Workoutsだけが失敗する部分エラー |
| `all-error` | DaysとWorkoutsがともに失敗する全体エラー |

新しいテストでは、まず意図を再現できる既存シナリオのうち最小のものを使う。テスト専用の
分岐をUIやドメインロジックに追加したり、1テストのためにほぼ同じfixtureを複製したりしない。
既存シナリオでは複数のテストが互いに矛盾する場合だけ、新しいシナリオを追加する。

ローカルでシナリオを指定する例:

```sh
pnpm test:e2e:empty
```

Playwrightのweb serverには`playwright.config.ts`が`FITNESS_DATA_SOURCE=fixture`を設定する。
production buildでfixtureを使うための`FITNESS_ALLOW_FIXTURE_IN_PRODUCTION=true`もテスト実行時に
限定して設定される。通常のdeploymentには設定しない。

## Fixtureの追加・変更

新しいシナリオを追加するときは、次を同じ変更に含める。

1. `lib/fixture/<scenario>-fixture.ts`に`FitnessDataSource`を満たすadapterを追加する。
2. 同じディレクトリの`<scenario>-fixture.test.ts`で、返す値またはエラーが決定論的であることを検証する。
3. `lib/fixture/index.ts`からexportする。
4. `lib/fitness-data-source-config/fitness-data-source-config.ts`の
   `FitnessFixtureScenario`、入力検証、エラーメッセージへシナリオ名を追加し、同じ場所のunit testを更新する。
5. `lib/fitness-data-source.ts`のシナリオとadapterの対応表へ追加する。
6. 必要なE2Eを追加し、専用シナリオが必要なspecでは`FITNESS_FIXTURE_SCENARIO`が一致しない実行を
   `test.skip`する。繰り返し使う実行方法だけ`package.json`のscriptへ追加する。

命名は次に統一する。

- 環境変数のシナリオ名とファイル名はkebab-case（例: `missing-nutrition`、
  `missing-nutrition-fixture.ts`）。
- export名は`<camelCaseScenario>FixtureFitnessDataSource`（例:
  `missingNutritionFixtureFitnessDataSource`）。通常シナリオだけは既存名の
  `fixtureFitnessDataSource`を維持する。
- シナリオ固有のE2Eは状態が分かる名前（例: `empty-state.spec.ts`）にする。

fixtureを変更すると既存のunit、E2E、baselineへ広く影響する。共有fixtureの意味を別のテストの
都合で変えず、必要なら派生fixtureで差分だけを上書きする。返却値は毎回新しい配列・objectとし、
テスト間でmutationが漏れないようにする。

## 日付とタイムゾーン

通常fixtureは `DaysResult.referenceDate` に `2026-08-23` を返し、ヒートマップの表示期間も固定する。
`missing-nutrition` と `workouts-error` は通常fixtureから同じ基準日を引き継ぐ。
基準日を省略するNotionデータソースでは、現在の日本時間を使用する。

- fixtureの日付は実行日から計算せず、`YYYY-MM-DD`の固定値を使う。`Date.now()`や引数なしの
  `new Date()`でfixtureの内容を変化させない。
- `YYYY-MM-DD`は時刻を持たないカレンダー日として扱う。日付の加減算が必要な場合は
  `T00:00:00Z`でparseし、`getUTC*`、`setUTC*`、`toISOString()`を使う。
- 画面表示などカレンダー日のformatはUTCを指定し、実行マシンのローカルタイムゾーンによる
  日付ずれを防ぐ。
- 「今日」をNotionの取得範囲など業務上の日付へ変換する場合だけ`Asia/Tokyo`を明示する。
  fixtureの固定日付を`Asia/Tokyo`でずらさない。
- 日付境界を扱うドメインロジックのunit testは、少なくとも`TZ=UTC`と`TZ=Asia/Tokyo`で
  同じ結果になることを確認する。

固定日付を変更するときは、その値を前提にするfixtureのunit test、集計のunit test、E2Eの文言、
visual baselineを検索し、意図した変更だけをまとめて更新する。

## テストの使い分け

| 種別 | 対象 | 置き場所・実行方法 |
| --- | --- | --- |
| unit | 集計、変換、入力検証、error変換、fixtureの契約。DOMやbrowserを必要としない振る舞い | 原則として実装と同じディレクトリ。`pnpm test:unit` |
| 操作E2E | routing、Server Component／Action、client操作、responsive、accessibilityを通した主要導線 | `e2e/*.spec.ts`。`pnpm test:e2e:functional` |
| visual regression | CSS、レイアウト、チャート、空・エラー状態など、値のassertionだけでは検出しにくい見た目 | `@visual`を付けたspecとLinux baseline。`pnpm test:e2e:visual` |

ドメインロジックの正しさをE2Eだけで担保しない。unit testで入力と出力の境界を細かく確認し、
E2Eでは利用者が見る代表的な導線を確認する。見た目の差分を操作E2Eの大量のCSS assertionで
代用せず、visual regressionは意図した画面状態へ到達したことをassertしてから撮影する。

UIを追加・変更した場合は、操作E2Eまたはvisual regressionで320pxと390pxの両方について、
横スクロールや欠けがないことと主要操作が使えることを確認する。

### E2Eの役割分担

- `pnpm test:e2e:functional`: `normal` の操作 E2E。`@visual` を除外し、Chromium の全 project で実行する。
- `pnpm test:e2e:empty`: `empty` の空状態を検証する。
- `pnpm test:e2e:all-error`: `all-error` の全体エラーを検証する。
- `pnpm test:e2e:workouts-error`: `workouts-error` の部分エラーを検証する。

上記のシナリオ専用コマンドは、対応する機能 spec だけを Chromium の320px・390px・desktopで実行する。
通常表示を前提とする spec や `@visual` は実行しない。CI の `Chromium E2E` job では上記4コマンドを
順に実行し、通常シナリオで作成した build を後続3シナリオでも再利用する。各実行でサーバーを起動し直し、
シナリオ専用コマンドが環境変数を切り替える。いずれかが失敗したら job も失敗し、後続は実行しない。
`missing-nutrition` は現時点で専用の機能 spec がないため、この実行対象には含めない。

- `pnpm test:e2e:visual`: visual regression。`@visual` だけを Linux で実行する。
- `pnpm test:e2e:visual:empty`: 空状態の visual regression を Linux で実行する。
- `pnpm test:e2e:visual:all-error`: 全体エラーの visual regression を Linux で実行する。
- `pnpm test:e2e:visual:workouts-error`: Workouts 部分エラーの visual regression を Linux で実行する。

GitHub Actions では `.github/workflows/ci.yml` と
`.github/workflows/visual-regression.yml` を分けているため、操作 E2E と visual
regression の成否は PR 上で独立して確認できる。

## 実Notion統合テスト

`pnpm verify`、`pnpm verify:all`、通常のPR CIでは実Notionへ接続しない。fixtureとNotion raw
responseのunit testで再現できる検証に、secret、network、API rate limit、個人データを持ち込まない。

Notion API version、Data Source schema、権限、query条件など、fixtureでは確認できない境界を変更した
場合だけ、担当者が明示的に実Notionで手動確認する。確認は読み取り専用のIntegrationと検証用データで
行い、secretや実データをtest code、fixture、log、artifact、PRへ残さない。実Notionの確認失敗を理由に
fixtureの期待値やbaselineを実データへ合わせて更新しない。

## Fresh worktreeのbootstrap

fresh worktreeでは、リポジトリルートで最初に次を実行する。

```sh
pnpm bootstrap
```

このコマンドはlockfileどおりの依存関係、Playwright Chromium、fixtureモードの`doctor`を順に実行する。
既存checkoutから`node_modules`、`.next`、`.env.local`、Notionのsecret、Playwright成果物をコピーしない。
詳細とトラブル時の確認方法は[Worktree bootstrap](./worktree-bootstrap.md)を参照する。

## WorktreeごとのE2E分離

Playwrightはworktreeの絶対パスから`3100`〜`5099`のportを決定し、web serverを再利用しない。
競合する場合は、各worktreeで異なるportを明示する。

```sh
PLAYWRIGHT_PORT=4101 pnpm test:e2e
```

`.next/`、`test-results/`、`playwright-report/`は各worktree内に生成し、別worktreeのbuildや
reportを参照・上書きしない。テスト結果は `test-results/<scenario>/`、HTML report は
`playwright-report/<scenario>/` に保存し、後続シナリオで上書きしない。
`PLAYWRIGHT_REUSE_BUILD=true` は `pnpm verify:all` や CI が同じworktreeで直前に作ったbuildを
使うための設定であり、別worktreeのbuild再利用には使わない。

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

baselineを更新してよいのは、レビュー対象のUI、fixture、撮影対象、または固定したPlaywright環境の
意図した変更により、正しい表示が変わる場合だけとする。単にvisual regressionを成功させるため、
原因を説明できない差分を受け入れるため、またはローカルOSの差分を消すためには更新しない。

1. 先に失敗時のactual、expected、diffを確認し、実装またはfixtureの不具合ではないことを確認する。
2. 上記コンテナ内で`pnpm test:e2e:visual:update`を実行する。シナリオ固有のbaselineを
   変更した場合は、該当する次のコマンドにも`--update-snapshots`を付けて実行する。

   - `pnpm test:e2e:visual:empty`
   - `pnpm test:e2e:visual:all-error`
   - `pnpm test:e2e:visual:workouts-error`

3. 変更された`e2e/*.spec.ts-snapshots/`の画像をすべて開き、320px、390px、身体組成の各指標、
   空状態、全体エラー、部分エラーについて、意図した表示だけが変化していることを目視確認する。
4. 更新に使った各コマンドを`--update-snapshots`なしで同じコンテナから再実行し、baselineと
   一致することを確認する。
5. spec、fixture、baselineを同じPRに含め、レビュー時にも変更画像を目視確認する。

### Baseline変更の並列作業

画像baselineは共有ファイルなので、同じbaseline群の更新を複数タスク・複数worktreeへ同時に
割り当てない。UI変更を並列化する場合も、baselineを生成してcommitする担当taskを1つに決める。
後続のbaseline担当は、先行するUI変更を統合先へ取り込んだ後、その最新状態から生成する。

競合時にどちらかの画像を機械的に選んだり、別worktreeで生成した画像をコピーしたりしない。
統合後のコードとfixtureから固定Linux環境で全baselineを再生成し、全画像を目視確認する。

## 統合時の再検証

各taskのbranchで検証済みでも、統合結果が同じとは限らない。統合担当は、対象branchを最新の
統合先branchへ追従させ、共有fixture、`package.json`、lockfile、Playwright設定、baselineの競合を
解消した最終状態で次を再実行する。

```sh
pnpm verify:all
```

これはBiome、unit、Next.js typegen、TypeScript、knip、fixture production build、全Playwright
projectの `normal` 機能E2E、Chromium の `empty`・`all-error`・`workouts-error` 機能E2Eを順に実行する。
`@visual` は除外する。通常シナリオでは Firefox と WebKit も使うため、初回は
`pnpm exec playwright install firefox webkit` で追加する。
別worktreeのserverや成果物を使わず、統合を行うworktree自身で実行する。
visual baselineに影響する変更では、これに加えて固定Linux環境のvisual regressionも再実行し、
成功結果と目視確認をmerge前に確認する。

## CI 失敗時の確認

`Linux visual regression` が失敗すると、GitHub Actions の run に
`visual-regression-failure-<run id>-<attempt>` artifact が14日間保存される。
artifact には次を含む。

- `test-results/<scenario>/`: expected、actual、diff 画像と `trace.zip`
- `playwright-report/<scenario>/`: HTML report

HTML report は展開後に `pnpm exec playwright show-report <展開先>/playwright-report/<scenario>` で開く。
trace は `pnpm exec playwright show-trace <trace.zip>` で確認する。
