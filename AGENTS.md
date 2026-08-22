<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## UI実装方針

- UIを追加・変更するときは、モバイルでの使いやすさを最優先にする。
- モバイルを基準にレイアウトを設計し、広い画面向けのスタイルはレスポンシブに拡張する。
- 狭い画面でも横スクロールやコンテンツの欠けが発生せず、主要な情報と操作が無理なく表示されることを確認する。
- タッチ操作を前提として、操作要素には十分な大きさと間隔を確保する。

## テスト配置方針

- unit testは原則として対象実装と同じディレクトリに配置する。
- 実装をディレクトリ化する場合は、実装とテストに具体的な名前を付ける（例: `weekly-review/weekly-review.ts` と `weekly-review/weekly-review.test.ts`）。
- `index.ts` は外部公開する要素の再エクスポートに限定する。
- E2Eテストや複数モジュールを横断するintegration testは、この方針の対象外とする。

## 変更の完了条件

- すべての変更で、基本の完了条件として `pnpm verify` を成功させる。
- 集計・変換・判定などのドメインロジックを追加または変更するときは、同じ変更にunit testを含める。
- UIを追加・変更するときは、320pxと390pxの両方を対象にE2Eまたはvisual regressionで表示と主要操作を確認する。
- Next.jsに関わるコードを変更するときは、実装前に `node_modules/next/dist/docs/` の関連ガイドを読み、現在のバージョンのAPIと非推奨事項に従う。
- 完了報告には、実行して成功した検証と、未実施の検証およびその理由を記載する。

## branch・worktreeの並列作業ルール

- herdrの有無にかかわらず、原則として1タスクを1 branch・1 Git worktreeで扱う。
- 各worktreeはタスク開始時点の最新の統合先branchから作成し、他タスクの未統合commitを暗黙に含めない。
- `package.json`、lockfile、共通fixture、画像baseline、CI設定など、複数タスクへ影響する共有ファイルは同時変更を避ける。やむを得ない場合は、担当間で変更範囲と統合順を先に決める。
- E2Eのポートと生成物はworktreeごとに分離し、別worktreeのserverやreportを再利用・上書きしない。
- 統合前に対象branchを最新の統合先へ追従させ、共有ファイルの競合と検証結果を再確認する。

## Code Review Rules

- レビューコメント、指摘内容、要約は日本語で記述する。
- コード、識別子、エラーメッセージ、技術用語は必要に応じて原文の英語を維持する。

## アーキテクチャ境界

- `app/` は Next.js のルーティング、Server Component のページ構成、Server Action とキャッシュ無効化を担当する。データ取得は `FitnessDataSource` の契約を介して行い、Notion SDKやraw responseを直接扱わない。
- `components/` は表示とユーザー操作を担当する。`"use client"` のコンポーネントでは `server-only` のモジュール、`process.env`、Notion SDKを参照せず、シリアライズ可能なドメインモデルをpropsで受け取る。集計や変換などのドメインロジックをUIへ持ち込まない。
- `lib/fitness/` はNotionに依存しないドメイン型と集計処理を置く。外部サービスの型やSDKをimportしない。
- `lib/fitness-data.ts` の `FitnessDataSource` はアプリケーションとデータソースの境界（port）とする。データソース固有の実装詳細をこの契約から漏らさない。
- `lib/fitness-data-source.ts` は `server-only` のcomposition rootとし、環境変数に応じたデータソースの選択をここに閉じ込める。`lib/fixture/` と `lib/notion.ts` は同じ `FitnessDataSource` 契約を実装するadapterとする。
- `lib/notion-client/`、`lib/notion-pagination/`、`lib/notion-schema/`、`lib/notion-errors/`、`lib/notion-mapper.ts`、`lib/notion.ts` はNotion infrastructure層であり、サーバー側からのみ参照する。Notionの秘密情報とSDKレスポンスはこの層の外へ出さず、mapperでドメインモデルへ、error translatorで `FitnessDataError` へ変換する。
- adapterは `FitnessDataSource` 契約とドメインモデルに依存して実装し、契約側からadapterを参照しない。`lib/fitness-data-source.ts` のcomposition rootだけが契約と各adapterの両方を参照して具体実装を選択・配線する。`app/`・`components/`・ドメイン層からNotion adapterを直接参照しない。
