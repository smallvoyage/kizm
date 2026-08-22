# Worktree bootstrap

herdrやCodexからfresh worktreeを作成したら、リポジトリルートで次の1コマンドを
実行します。

```bash
pnpm bootstrap
```

bootstrapは次の処理を順番に行い、途中で失敗した場合はその終了コードを返します。

1. `pnpm install --frozen-lockfile`による依存関係の復元
2. Playwright Chromiumのインストール
3. `FITNESS_DATA_SOURCE=fixture`を設定した`pnpm run doctor`

fixtureをプロセスの環境変数で指定するため、`.env.local`やNotionのsecretを既存checkoutから
コピーする必要はありません。bootstrap後は同じくsecretなしでsmoke検証を実行できます。

```bash
pnpm verify
```

E2Eまで含める場合は`pnpm verify:all`を使用します。

## Worktree間の分離

各コマンドの生成物は、実行したworktree内の次の場所へ出力されます。

| 対象 | 出力先 |
| --- | --- |
| unit test | `node_modules/.vite/` |
| Next.js typegen / build | `.next/` |
| E2E結果 | `test-results/` |
| E2E HTML report | `playwright-report/` |

これらはすべてGit管理外であり、別worktreeのbuildやテスト結果を再利用しません。

## ポート競合を避ける

複数worktreeのdev serverを同時に起動する場合は、worktreeごとに異なるポートを指定します。

```bash
pnpm dev --port 3001
```

E2Eはworktreeの絶対パスから`3100`〜`5099`のポートを自動選択します。自動選択したポートが
別プロセスと競合した場合や、確実に固定したい場合はworktreeごとに異なる
`PLAYWRIGHT_PORT`を指定します。

```bash
PLAYWRIGHT_PORT=4101 pnpm test:e2e
```
