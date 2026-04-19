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

記録できる項目:

- `title` タイトル（省略可）
- `event` 出来事（何があったか）
- `thought` 思考（どう感じたか）
- `entry_date` 日付 `YYYY-MM-DD`（省略時は JST 今日）
- `entry_time` 時刻 `HH:MM`
- `tags` タグ配列
- `star_rating` 1-5 評価
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

## ライセンス

MIT
