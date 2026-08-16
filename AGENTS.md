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

## Code Review Rules

- レビューコメント、指摘内容、要約は日本語で記述する。
- コード、識別子、エラーメッセージ、技術用語は必要に応じて原文の英語を維持する。
