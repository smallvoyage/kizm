# Fitness Analytics

A personal fitness analytics dashboard for visualizing body composition, nutrition, activity, and workout progress from Notion data.

Notionをデータ入力・保存先として使い、日々のフィットネスデータを見やすく可視化する個人用Webアプリです。現在のMVPはBody Composition（体重・体脂肪率・筋肉量）に対応しています。

## 技術構成

- Next.js 16（App Router）
- React 19 / TypeScript
- Tailwind CSS 4
- shadcn/ui / shadcn/ui Charts
- Recharts
- Notion JavaScript SDK / Data Source Query API（Notion API `2026-03-11`）
- pnpm
- Vercel

## MVPの機能

- 体重・体脂肪率・筋肉量の最新有効値と、直前の有効値からの差分
- kg用の左Y軸と%用の右Y軸を持つBody Compositionチャート
- 指標ごとの表示切り替え（最低1系列は常に表示）
- 7日・30日・90日・全期間のフィルター（初期値は30日）
- 欠損値、空データ、対象期間の空データ、設定不備、Notion APIエラーの表示
- PC・スマートフォンに対応したレスポンシブUI

## アーキテクチャ

```text
app/page.tsx                         Server Component / データ取得とページ構成
components/body-composition-chart.tsx Client Component / フィルターとチャート操作
components/metric-card.tsx           Current Metricsの表示
components/ui/                        利用するshadcn/uiコンポーネント
lib/notion.ts                         Notion Client、pagination、検証、正規化
lib/fitness.ts                        ドメイン型とNotion非依存の集計処理
```

`NOTION_TOKEN` とNotion SDKは `lib/notion.ts` のサーバー側に閉じています。UIにはNotionのレスポンスを直接渡さず、次のドメインモデルに変換します。

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

Data Source Queryは100件ずつ全ページを取得し、Log Date昇順へ並べ替えます。値が未入力のnumberプロパティは `null` として扱い、Log Dateが未入力の行はチャート対象外にします。

## セットアップ

### 1. インストール

Node.js 20以降とpnpmを用意し、依存パッケージをインストールします。

```bash
pnpm install
```

### 2. Notion Integrationを作成する

1. [My integrations](https://www.notion.so/profile/integrations) を開きます。
2. 新しいInternal Integrationを作成し、対象Workspaceを選びます。
3. 読み取り用途のため、Content capabilityは `Read content` を有効にします。
4. 作成後にInternal Integration Secretをコピーします。これが `NOTION_TOKEN` です。

トークンは秘密情報です。ブラウザへ渡したり、Gitへcommitしたりしないでください。

### 3. Notion Data Sourceを準備する

1日1レコードで、以下の名前と型を完全一致で作成してください。

| プロパティ | 型 |
| --- | --- |
| Log Date | Date |
| Steps | Number |
| Total Calories | Number |
| Total Protein | Number |
| Total Fat g | Number |
| Total Carbs g | Number |
| Weight kg | Number |
| Body Fat % | Number |
| Muscle Mass kg | Number |

NotionのData Sourceには通常Titleプロパティも存在しますが、このアプリでは参照しません。Body Composition以外のNumberプロパティは将来の拡張用で、今回の画面には表示されません。

### 4. Integrationを接続する

1. 対象Databaseをフルページで開きます。
2. 右上の `•••` またはShareメニューを開きます。
3. `Add connections` から作成したIntegrationを選択します。

接続されていないDatabaseをAPIからqueryすると取得できません。

### 5. NOTION_DATA_SOURCE_IDを確認する

Database設定の `Manage data sources` を開き、対象Data Sourceの `•••` メニューから `Copy data source ID` を選びます。Database URL内のDatabase IDとは別のIDなので注意してください。

代替手段として、Database IDを使ってRetrieve a database APIを呼び、レスポンスの `data_sources` 配列にある対象Data Sourceの `id` を確認できます。

### 6. 環境変数を設定する

```bash
cp .env.example .env.local
```

`.env.local` を編集します。

```dotenv
NOTION_TOKEN=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATA_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

`.env.local` は `.gitignore` 対象です。クライアントに公開される `NEXT_PUBLIC_` 接頭辞は使用しません。

## ローカル開発

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) を開きます。

品質チェック:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Vercelへのデプロイ

1. GitHub上のこのリポジトリをVercelへImportします。
2. Framework PresetがNext.js、Install Commandが `pnpm install` であることを確認します。
3. Project SettingsのEnvironment Variablesに次を登録します。
   - `NOTION_TOKEN`
   - `NOTION_DATA_SOURCE_ID`
4. Productionへデプロイします。Preview環境でも実データを確認する場合は、同じ環境変数をPreviewにも設定します。

Notion Integrationが対象Databaseへ接続されていれば、Vercelから追加のDBやバックエンドサービスなしで読み取れます。

## 今後の拡張

Nutrition・Activityは既存の `FitnessLog` と `lib/notion.ts` の正規化結果を再利用し、専用の集計関数とClient Chart Componentを追加できます。Workoutは種目・セット単位の別Data Sourceを想定し、`FitnessLog` に無理に混在させず、`WorkoutLog` など独立したドメインモデルと取得関数を追加する方針です。Server Componentだけが各Data Sourceを取得し、Client Componentには正規化済みデータだけを渡します。
