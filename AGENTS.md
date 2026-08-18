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
