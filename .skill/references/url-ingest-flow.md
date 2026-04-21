# URL → wiki 変換フロー

URL を取り込み `source-url` ページとして保存し、抽出した entity / concept を関連ページとして作成/更新する。

## 起動条件

- 明示指示のみ: 「この URL を取り込んで」「〇〇 を wiki に追加」「URL を grow-wiki に保存」
- 会話に URL が単に含まれているだけでは自動起動しない（過剰発火防止）

## 手順

### 1. URL の抽出・確認

ユーザー発話から URL を抽出。複数 URL がある場合はどれを対象にするか確認。

### 2. WebFetch で取得

```
WebFetch url=<URL> prompt="記事本文、タイトル、著者、公開日、サイト名を抽出してください。本文は見出し構造を保ったまま Markdown で返してください。"
```

取得失敗時（403/404/タイムアウト/ペイウォール）:
- 骨格だけ作成し `status: draft` で保存
- 本文セクションに `取得失敗: <HTTP ステータス or エラー要約>` を記録
- 後で `rebuild on <path>` コマンドで再試行できる形を残す

### 3. メタデータ抽出

取得結果から以下を取り出す:

| フィールド | 抽出元 |
|---|---|
| `title` | `<title>` タグ、`<h1>`、OpenGraph `og:title` |
| `author` | `<meta name="author">`、記事内の署名、OpenGraph |
| `published_at` | `<time>` タグ、meta タグ、本文冒頭の日付 |
| `site_name` | OpenGraph `og:site_name`、ドメイン名 |
| `fetched_at` | 現在時刻（ISO8601 + タイムゾーン） |
| `source_url` | 正規化した URL（トラッキングパラメータ除去） |

抽出できないフィールドは空文字または省略。

### 4. 本文の構造化

長い記事をそのまま保存しない。要約して 4-8 セクションに再構成:

- `## 概要` — 1 文要約
- `## 要点` — 箇条書き 3-7 項目
- `## 詳細` — 主要節ごとに整理
- `## 原文引用` — 重要部分の**短い**引用のみ（全文コピーはしない）
- `## 関連` — `[[wikilink]]`

長い記事は 8000 文字を超えないように要約する（lint L2 の warn 閾値）。

### 5. wikilink 付与・新規 entity/concept 抽出

[wikilink-rules.md](wikilink-rules.md) に従い、既存用語を `[[...]]` で囲む。記事内で頻出する新規固有名詞 / 専門用語を entity / concept ページ候補として抽出。

### 6. タイトル・ファイル名

- 元記事タイトルをベースに、必要なら日本語で要約・補足
- 重複時は文脈サフィックス（例: `Why React Re-Renders (Josh Comeau).md`）
- [naming-conventions.md](naming-conventions.md) の禁止文字ルールを適用

### 7. プレビューと承認

会話 ingest と同じ形式でプレビュー。承認後に書き込み。

### 8. 書き込み・索引更新・ログ・lint

1. `sources/urls/<filename>.md` を Write
2. 抽出した entity / concept を作成または追記
3. `rebuild-index.sh sources/urls` を実行
4. ルート `index.md` を再生成
5. `log.md` に `## [YYYY-MM-DD] create | sources/urls/<filename>.md | <URL>` を追記
6. `lint.sh` を実行して結果を要約

## URL 正規化

- `utm_source`, `utm_medium` 等のトラッキングパラメータは除去
- ハッシュフラグメント `#...` は意味がある場合だけ残す
- HTTPS が使えるなら HTTPS に統一

## 著作権・引用量

- 全文コピーは避ける（著作権配慮）
- 引用は記事ごと合計 500 文字以内を目安
- 自分の言葉で要約する

## 失敗時の再試行

draft 状態のページを再取得する場合:

```
1. 該当ページを Read して frontmatter の source_url を取得
2. WebFetch で再試行
3. 取得成功なら regenerate として全置換、status を stable に
4. log.md に「retry success」を記録
```

## 同一 URL の再取り込み

既に `source_url` が一致するページがある場合:

1. `fetched_at` を見て 24 時間以内なら「最近取り込み済みです」と通知してスキップ
2. それ以前なら「更新しますか？（追記/再生成を選べます）」とユーザーに確認
3. 再生成時は古い `fetched_at` を frontmatter から削除し新しい値に置換
