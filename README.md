# Journal Mandala MCP

[Journal Mandala](https://journal-mandala.vercel.app) に Claude から直接日記エントリを書き込むための MCP サーバーです。

「思考の流れ」を会話の途中でマンダラに刻みたいときに使います。

## 必要なもの

- Node.js 20+
- Claude Desktop (または Claude Code)
- Journal Mandala の **API キー** （発行方法は「APIキーの取得」参照）

## インストール

`npm` でグローバルにインストールします。

```sh
npm install -g github:takezone/journal-mandala-mcp
```

更新するときは同じコマンドを再実行します。

## Claude Desktop の設定

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) を編集:

### 1アカウント運用

```json
{
  "mcpServers": {
    "journal-mandala": {
      "command": "journal-mandala-mcp",
      "env": {
        "JOURNAL_MANDALA_API_KEY": "jm_XXXXXXXXXXXXXXXXXXXXXXXX"
      }
    }
  }
}
```

### 2アカウント（personal / work）を切り替えたい場合

```json
{
  "mcpServers": {
    "journal-mandala-personal": {
      "command": "journal-mandala-mcp",
      "env": {
        "JOURNAL_MANDALA_API_KEY": "jm_PERSONAL_KEY"
      }
    },
    "journal-mandala-work": {
      "command": "journal-mandala-mcp",
      "env": {
        "JOURNAL_MANDALA_API_KEY": "jm_WORK_KEY"
      }
    }
  }
}
```

それぞれ別ツールとして Claude から見えます。「work に記録して」のように自然言語で切り替え可能。

設定後は Claude Desktop を再起動。

## APIキーの取得

現在は Journal Mandala 管理者（@takezone）に以下を伝えて発行してもらってください:

1. 自分の Google アカウントのメールアドレス
2. ラベル名（例: `alice-personal`）

管理者から API キーが送られてきたら、上の設定の `JOURNAL_MANDALA_API_KEY` にコピペします。

> **Note:** 将来的にブラウザで自動発行できる予定です。

## 使い方

Claude との会話で「今日の出来事をジャーナルに記録して」のように依頼すると、`add_journal_entry` ツールが呼ばれて Journal Mandala にエントリが追加されます。

提供ツール:

### `add_journal_entry` — 日記エントリ追加

- `title` タイトル（省略可）
- `event` 出来事（何があったか）
- `thought` 思考（どう感じたか）
- `entry_date` 日付 `YYYY-MM-DD`（省略時は JST 今日）
- `entry_time` 時刻 `HH:MM`
- `tags` タグ配列 — **文字列の配列として渡すこと**
  - ✅ 正: `["仕事", "運動"]`
  - ❌ 誤: `["[\"仕事\",\"運動\"]"]` (JSON 文字列化した配列を1要素にしない)
- `star_rating` 1-5 評価

### `find_entries` — 最近のエントリ一覧

id を取得する目的で使う。直近更新順で返す。

- `limit` 取得件数 (デフォルト 20、最大 100)

### `update_entry` — 既存エントリ更新

id 指定で部分更新。指定したフィールドのみ上書き、省略したフィールドは維持。

- `id` **必須**
- 他は `add_journal_entry` / `add_todo` と同じフィールドが全て任意指定可能

使い方: `find_entries` で id を調べる → `update_entry` で更新

### `add_todo` — Todo 追加

- `title` タスク名（**必須**）
- `thought` タスクに関するメモ（任意）
- `entry_date` 作成日（省略時は JST 今日）
- `due_date` 期限日 `YYYY-MM-DD`（任意）
- `todo_status` `pending` | `in_progress` | `completed` | `cancelled`（省略時 pending）
- `todo_points` 見積もりポイント（任意）
- `is_today` 今日やるリストフラグ（任意）
- `tags` タグ配列
  - `1`: 微妙・ネガティブな出来事
  - `2`: 普通の1日（デフォルト）
  - `3`: そこそこ良いことがあった日
  - `4`: かなり良いことがあった日
  - `5`: 人生の一大イベント級
  - **安易に 5 を付けない。基本は 2、良いことがあれば 3 or 4**

`title` / `event` / `thought` のいずれか1つは必須です。

## オプション環境変数

- `JOURNAL_MANDALA_API_URL` — APIエンドポイント (デフォルト: `https://journal-mandala.vercel.app`)

## トラブルシューティング

- **Claude にツールが表示されない** → 設定ファイルのJSON構文エラーの可能性。Claude Desktop の Developer メニューで MCP ログを確認
- **API エラー 401** → `JOURNAL_MANDALA_API_KEY` が無効。管理者に再発行を依頼
- **ネットワークエラー** → Vercel の稼働状況を確認

## 管理者向け: APIキーの管理と復旧

運用者がキーを紛失した時の参考。このMCPはVercel側に保存された正本を参照するので、`~/.claude.json` のコピーが消えても復旧できる。

### 3層構造

| 層 | 場所 | 役割 |
|---|---|---|
| サーバー env var | Vercel `JM_API_ACCOUNTS` 環境変数 | 初期seedの静的アカウント配列（正本） |
| サーバー KV | Vercel KV (Upstash Redis) | `/api/enroll` で追加したアカウント（正本） |
| クライアント | `~/.claude.json` など | 認証用のキーコピー（失くしても再取得可） |

API認証時は KV → env var の順に照合される。

### 復旧手順（プロジェクトオーナー）

プロジェクトディレクトリ（`journal-mandala` 本体）で:

```sh
# Vercel プロジェクトと連携（初回のみ）
vercel link --yes --project journal-mandala

# サーバー環境変数をローカルに取得
vercel env pull .env.vercel

# env var 内のキー確認
grep JM_API_ACCOUNTS .env.vercel

# KV 内のキー一覧スキャン
source .env.vercel
curl -s "${KV_REST_API_URL}/scan/0/match/jm:account:*/count/100" \
  -H "Authorization: Bearer ${KV_REST_API_TOKEN}"

# 特定アカウントの中身を見る
curl -s "${KV_REST_API_URL}/get/jm:account:jm_XXXXX" \
  -H "Authorization: Bearer ${KV_REST_API_TOKEN}"

# 終わったら機密情報を必ず削除
rm -f .env.vercel .vercel/project.json && rmdir .vercel 2>/dev/null
```

### 新規キー発行

1. Chrome で対象Googleアカウントでログイン
2. `https://journal-mandala.vercel.app/api/enroll?label=<任意ラベル>` を開く
3. OAuth承認 → 画面にAPIキーが1回だけ表示されるのでコピー
4. `~/.claude.json` の `mcpServers.*.env.JOURNAL_MANDALA_API_KEY` に反映

同じGoogleアカウントで再enrollすると、古いキーは自動失効し新しいキーに差し替わる。

## ライセンス

MIT
