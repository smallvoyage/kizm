# Fitness Analytics

A personal fitness analytics dashboard for visualizing body composition, nutrition, activity, and workout progress from Notion data.

Notionをデータ入力・保存先として使い、日々のフィットネスデータを見やすく可視化する個人用Webアプリです。身体組成（体重・体脂肪率・筋肉量）と食事状況（カロリー・三大栄養素）に対応しています。

## 技術構成

- Next.js 16（App Router）
- React 19 / TypeScript
- Tailwind CSS 4
- shadcn/ui / shadcn/ui Charts
- Recharts
- Notion JavaScript SDK / Data Source Query API（Notion API `2026-03-11`）
- Biome
- pnpm
- Vercel

## MVPの機能

- 体重・体脂肪率・筋肉量の最新有効値と、直前の有効値からの差分
- kg用の左Y軸と%用の右Y軸を持つBody Compositionチャート
- 指標ごとの表示切り替え（最低1系列は常に表示）
- 7日・30日・90日・全期間のフィルター（初期値は30日）
- 欠損値、空データ、対象期間の空データ、設定不備、Notion APIエラーの表示
- PC・スマートフォンに対応したレスポンシブUI
- 最新の摂取カロリー・たんぱく質・脂質・炭水化物
- 1日の目標に対するカロリー・三大栄養素の残量と達成状況
- 直近12週間の食事目標達成状況と日別PFCを確認できるヒートマップ
- 種目ごとの最新代表セット、前回比、重量・回数の推移

## アーキテクチャ

```text
app/page.tsx                         Server Component / データ取得とページ構成
components/body-composition-chart.tsx Client Component / フィルターとチャート操作
components/nutrition-summary.tsx      最新の食事状況
components/nutrition-heatmap.tsx      食事目標の達成状況と日別詳細
components/training-progress.tsx      種目選択と代表セットの推移
components/ui/                        利用するshadcn/uiコンポーネント
lib/fitness-data.ts                   Days / Workoutsのデータ取得契約
lib/fitness-data-source.ts            使用するデータソースのエントリポイント
lib/fixture/                           秘密情報を必要としないfixtureデータソース
lib/notion.ts                         Notion Client、pagination、検証
lib/notion-mapper.ts                  Notion Pageからドメインモデルへの変換
lib/fitness.ts                        ドメイン型とNotion非依存の集計処理
lib/nutrition-goals.ts                1日の栄養目標のサーバー側設定
```

`NOTION_TOKEN` とNotion SDKは `lib/notion.ts` のサーバー側に閉じています。画面は `FitnessDataSource` の共通契約を通じてDaysとWorkoutsを取得し、Notionのレスポンスを直接受け取りません。UIへ渡すデータは次のNotion非依存のドメインモデルに変換します。

```ts
type FitnessLog = {
  date: string
  steps: number | null
  calories: number | null
  protein: number | null
  fat: number | null
  carbs: number | null
  weight: number | null
  bodyFat: number | null
  muscleMass: number | null
}
```

食事ヒートマップの達成度は、カロリーとPFCすべてから5段階で判定します。カロリーが目標の90〜110%かつ、PFCがそれぞれ100%以上なら「達成」、カロリーが80〜120%かつ、PFCがそれぞれ80%以上なら「おおむね達成」、カロリーが60〜140%かつ、PFCがそれぞれ60%以上なら「一部達成」、それ以外は「未達」です。栄養値がすべて未入力の日は「記録なし」として区別します。

MVPではDays Data Sourceのみを使用します。Data Source Queryは100件ずつ全ページを取得し、Log Date昇順へ並べ替えます。値が未入力のnumberプロパティは `null` として扱い、Log Dateが未入力の行はチャート対象外にします。MealsとWorkoutsのIDは将来機能用で、現時点ではAPI queryを行いません。

## セットアップ

### 1. インストール

`.node-version` に記載されたNode.js 24.19.0とpnpmを用意し、依存パッケージをインストールします。

```bash
pnpm run doctor
pnpm install
```

`pnpm run doctor` はNode.js・pnpm・package scriptsで使うコマンド・lockfile・
インストール済み依存関係を検査します。pnpm自身に同名の組み込みコマンドがあるため、
`run` を省略せずに実行してください。依存導入前は不足と修復方法を表示して終了します。

Notionへ接続せずに起動する場合は、データソースを明示的にfixtureへ切り替えます。
現在のfixtureは空データを返し、Notion用の環境変数を必要としません。

```dotenv
FITNESS_DATA_SOURCE=fixture
```

`FITNESS_DATA_SOURCE`を未指定にした場合はNotionを使用します。productionでは誤ってfixtureを
表示しないよう、上記に加えて`FITNESS_ALLOW_FIXTURE_IN_PRODUCTION=true`を明示した場合だけ
fixtureを使用できます。この追加許可はE2Eなど意図的なテスト環境に限定し、通常のproduction
deploymentには設定しないでください。

### 2. Notion Integrationを作成する

1. [My integrations](https://www.notion.so/profile/integrations) を開きます。
2. 新しいInternal Integrationを作成し、対象Workspaceを選びます。
3. 読み取り用途のため、Content capabilityは `Read content` を有効にします。
4. 作成後にInternal Integration Secretをコピーします。これが `NOTION_TOKEN` です。

トークンは秘密情報です。ブラウザへ渡したり、Gitへcommitしたりしないでください。

### 3. Notion Data Sourceを準備する

このプロジェクトでは次の3つのData Sourceを想定しています。

| Data Source | 環境変数 | 用途 |
| --- | --- | --- |
| Days | `NOTION_DAYS_DATA_SOURCE_ID` | Body Compositionと将来のActivity |
| Meals | `NOTION_MEALS_DATA_SOURCE_ID` | 将来のNutrition Analytics |
| Workouts | `NOTION_WORKOUTS_DATA_SOURCE_ID` | 将来のWorkout Analytics |

Daysには1日1レコードで、以下の名前と型を完全一致で作成してください。

| プロパティ | 型 |
| --- | --- |
| Log Date | Date |
| Steps | Number |
| Total Calories | Rollup（Number） |
| Total Protein g | Rollup（Number） |
| Total Fat g | Rollup（Number） |
| Total Carbs g | Rollup（Number） |
| Weight kg | Number |
| Body Fat % | Number |
| Muscle Mass kg | Number |

NotionのData Sourceには通常Titleプロパティも存在しますが、このアプリでは参照しません。アプリの動作に必須のプロパティは `Log Date`、`Weight kg`、`Body Fat %`、`Muscle Mass kg` です。Stepsは未作成・未入力でも `null` として扱い、現在の画面には表示しません。食事状況のサマリとチャートを利用するには、`Total Calories`、`Total Protein g`、`Total Fat g`、`Total Carbs g` の4つも作成してください。これらの栄養集計はMealsとのRelationを使った数値Rollupとして読み取り、未作成・未入力の場合は食事状況にデータが表示されません。

Workoutsには同一の重量・回数をまとめて1レコードで記録し、セット数を `Set Count` に入力してください。`Weight kg` はNotion上で文字列として保存されますが、数値として解釈できない行や、`Set Count` が1以上の整数でない行はチャート・画像出力の対象外になります。

| プロパティ | 型 |
| --- | --- |
| Exercised Day | Title（`YYYY-MM-DD`） |
| Category | Select |
| Exercise | Select |
| Weight kg | Rich text（数値） |
| Reps | Number |
| Set Count | Number（1以上の整数） |

同一日の同一種目に複数セットがある場合は、Epley式 `重量 × (1 + 回数 / 30)` で推定1RMを計算し、最大値のセットだけをその日の代表として表示します。推定1RM自体は比較にのみ使用し、画面には表示しません。
種目セレクトでは `Category` ごとに種目を分類し、カテゴリと種目はそれぞれ最新の記録がある順に表示します。`Category` が未入力の記録は「未分類」にまとめます。

### 4. Integrationを接続する

1. 対象Databaseをフルページで開きます。
2. 右上の `•••` またはShareメニューを開きます。
3. `Add connections` から作成したIntegrationを選択します。

接続されていないDatabaseをAPIからqueryすると取得できません。

### 5. Data Source IDを確認する

各Database設定の `Manage data sources` を開き、対象Data Sourceの `•••` メニューから `Copy data source ID` を選びます。Database URL内のDatabase IDとは別のIDなので注意してください。MVPではDaysのIDを `NOTION_DAYS_DATA_SOURCE_ID` に設定します。

代替手段として、Database IDを使ってRetrieve a database APIを呼び、レスポンスの `data_sources` 配列にある対象Data Sourceの `id` を確認できます。

### 6. 環境変数を設定する

```bash
cp .env.example .env.local
```

`.env.local` を編集します。

```dotenv
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DAYS_DATA_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NOTION_MEALS_DATA_SOURCE_ID=
NOTION_WORKOUTS_DATA_SOURCE_ID=
```

`.env.local` は `.gitignore` 対象です。クライアントに公開される `NEXT_PUBLIC_` 接頭辞は使用しません。

MVPで必須なのは `NOTION_TOKEN`、`NOTION_DAYS_DATA_SOURCE_ID`、`NOTION_WORKOUTS_DATA_SOURCE_ID` です。Mealsの環境変数は将来機能を実装するまで空のままで構いません。1日の摂取目標は `lib/nutrition-goals.ts` で設定します。

## ローカル開発

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

品質チェック:

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
```

## Vercelへのデプロイ

1. GitHub上のこのリポジトリをVercelへImportします。
2. Framework PresetがNext.js、Install Commandが `pnpm install` であることを確認します。
3. Project SettingsのEnvironment Variablesに次を登録します。
   - `NOTION_TOKEN`
   - `NOTION_DAYS_DATA_SOURCE_ID`
   - `NOTION_MEALS_DATA_SOURCE_ID`（将来のNutrition Analytics用・MVPでは任意）
   - `NOTION_WORKOUTS_DATA_SOURCE_ID`
4. Productionへデプロイします。Preview環境でも実データを確認する場合は、同じ環境変数をPreviewにも設定します。

Notion Integrationが対象Databaseへ接続されていれば、Vercelから追加のDBやバックエンドサービスなしで読み取れます。

## 今後の拡張

ActivityはDaysの `FitnessLog` と `lib/notion.ts` の正規化結果を再利用できます。NutritionはMealsから `MealLog` へ正規化する方針です。WorkoutはWorkoutsから `WorkoutSet` へ正規化し、代表セットの選定はNotion非依存の集計処理として `lib/fitness.ts` に置いています。Server Componentだけが各Data Sourceを取得し、Client Componentには正規化済みデータだけを渡します。
