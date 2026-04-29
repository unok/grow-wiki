# 会話 → wiki 変換フロー

会話内容を `source-conversation` ページとして保存し、そこから抽出した entity / concept を関連ページとして作成/更新する。

## 手順

### 1. 対象範囲の確認

ユーザーに「どの発話範囲を保存するか」を必ず確認する。曖昧なら「直前のやりとり全体でよいですか？それとも特定のトピックだけですか？」と聞く。

### 2. 既存ページの取得

```bash
node .skill/scripts/list-pages.js
```

を実行して vault 内の全ページを JSON で取得。以降の wikilink 解決・衝突検出に使う。

### 3. 分類と構造化

会話内容から以下を抽出:

- **メインソースページ**: `source-conversation` として 1 ページ
- **entity**: 新規に名前の挙がった人物・ツール・製品
- **concept**: 新規に出てきた概念・トピック

既存ページとタイトルが一致 or `aliases` 一致したら新規作成せず、**更新**扱いにする（[update-logic.md](update-logic.md) 参照）。

### 4. タイトル生成

- 日本語の自然な見出し風に（「React Hooks の useMemo と useCallback の使い分け」のように）
- 疑問形より結論形を優先
- 80 文字以内
- 命名規則は [naming-conventions.md](naming-conventions.md) に従う

### 5. 本文の構造化

`source-conversation.md` テンプレに沿って:

- `## 背景` — 1-3 行。なぜ話題になったか
- `## 要点` — 箇条書き 3-7 項目。既知用語は `[[wikilink]]` で囲む
- `## 詳細` — 重要なやりとり。コードスニペット OK
- `## 関連` — `[[エンティティ]]` `[[概念]]` を列挙

### 6. wikilink 付与

[wikilink-rules.md](wikilink-rules.md) に従い、既存ページ名/aliases に一致する語を `[[...]]` で囲む。新規 entity/concept として切り出した対象も積極的にリンクする。

### 7. プレビューと承認

以下の形式でユーザーに提示:

```
📝 保存予定:

[新規] sources/conversations/<slug>.md
--- frontmatter ---
title: ...
tags: [...]
---
<本文プレビュー>

[新規/更新] concepts/<name>.md
...

[新規/更新] entities/<name>.md
...

このまま保存してよいですか？ 変更があれば指示してください。
```

### 8. 書き込み・索引更新・ログ・lint

1. ファイル書き込み（Write ツール）
2. 変更のあったフォルダの `index.md` を `rebuild-index.js <folder>` で再生成
3. ルート `index.md` も再生成（フォルダ構成に変更があった場合）
4. `log.md` に各変更を追記
5. `lint.js` を実行、結果を要約してユーザーに報告

## ファイル名の決定

- 日本語タイトルをそのままファイル名にする（Obsidian は対応）
- ファイル名での禁止文字 `/ \ : * ? " < > |` は除去
- 全角スペースはハイフン `-` に変換
- 衝突した場合: まず文脈サフィックス（`-2`, `-3` ではなく意味のある接尾辞を優先）

## 既存エントリ更新の判断

新規 vs 既存の判定:

1. タイトル完全一致 → 更新
2. `aliases` 一致 → 更新
3. 既存タイトルの `synonyms` 一致 → 更新
4. Jaccard 類似度（tags 重複率）> 0.7 かつ同一 type → ユーザーに統合するか確認
5. それ以外 → 新規

更新時の追記/再生成の判断は [update-logic.md](update-logic.md) を参照。
