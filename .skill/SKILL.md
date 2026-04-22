---
name: grow-wiki
description: >
  会話内容・URL・メモを Obsidian 互換 markdown wiki として継続的に蓄積するスキル。
  sources/entities/concepts の3層構造、YAML frontmatter、[[wikilink]] を用いる。
  書き込み先は環境変数 GROW_WIKI_ROOT で指定された Obsidian vault 内のサブフォルダ。
  トリガー例：「grow-wiki に保存」「wiki に追加」「ページを更新」
  「メモっておいて」「覚えておいて」「あとで読む」「ブックマーク」「wiki化」
  「この URL を取り込んで」。書き込み前に必ずユーザー承認を取り、ingest 完了後に
  lint を自動実行して整合性を検証する。
---

# grow-wiki

個人ウィキを会話と URL から育てるスキル。

## パス設定

- **スキル本体**: `~/.claude/skills/grow-wiki/`（clone 先の `<path-to-clone>/.skill/` へのシンボリックリンク）
- **wiki コンテンツの書き込み先**: 環境変数 `GROW_WIKI_ROOT` で指定する絶対パス
  - 推奨設定場所: `~/.claude/settings.json` の `env` セクション
    ```json
    { "env": { "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki" } }
    ```
  - 未設定時は全スクリプトが exit 2 で停止し、設定方法を表示する（デフォルトパスは使わない）
  - vault を変更したい時は settings.json の 1 行を書き換えるだけ。スクリプトはハードコードされたパスを持たない

**重要**: 本ドキュメント内で `vault root` や `$WIKI_ROOT` と書かれている箇所はすべて `$GROW_WIKI_ROOT` の実値に読み替える。ingest フローで書き込むファイルの絶対パスも `$GROW_WIKI_ROOT` 起点で組み立てる。

## ページ種別

| type | 格納先 | 用途 |
|---|---|---|
| `source-conversation` | `sources/conversations/` | 会話から生成したソース |
| `source-url` | `sources/urls/` | URL から取り込んだソース |
| `entity` | `entities/` | 人物・ツール・製品などの固有名詞 |
| `concept` | `concepts/` | 概念・トピック |

フロントマターの仕様は [references/frontmatter-spec.md](references/frontmatter-spec.md)。

## 基本ワークフロー

1. **トリガー検知** — [references/triggers.md](references/triggers.md) のルールで起動。キーワード自動提案時は「grow-wiki に保存しましょうか？」と確認
2. **既存ページ取得** — `.skill/scripts/list-pages.sh` で vault 内の全ページの frontmatter を JSON で読み込む
3. **分類と下書き** — type 判定、タイトル生成、本文構造化、`[[wikilink]]` 付与。[references/wikilink-rules.md](references/wikilink-rules.md) と [references/naming-conventions.md](references/naming-conventions.md) に従う
4. **プレビューと承認** — 新規/更新ファイルの差分をユーザーに提示して承認を取得
5. **書き込み** — 承認後にファイルを作成/更新
6. **索引更新** — 変更があったフォルダの `index.md` を `.skill/scripts/rebuild-index.sh` で再生成
7. **ログ追記** — `log.md` に `## [YYYY-MM-DD] action | path | summary` を append
8. **Lint 実行** — `.skill/scripts/lint.sh` を実行。error があればユーザーに報告し修正を提案。warn は `log.md` に記録

## フロー別の詳細

- 会話 → wiki: [references/conversation-ingest-flow.md](references/conversation-ingest-flow.md)
- URL → wiki: [references/url-ingest-flow.md](references/url-ingest-flow.md)
- 既存ページ更新: [references/update-logic.md](references/update-logic.md)
- **Q&A での参照**: [references/query-flow.md](references/query-flow.md)
- フォルダ自動分割: [references/folder-rebalance.md](references/folder-rebalance.md)
- Lint 全ルール: [references/lint-rules.md](references/lint-rules.md)
- ページテンプレ: [references/page-templates.md](references/page-templates.md)

## 参照ワークフロー（Q&A 時）

ユーザーから質問・相談があり、grow-wiki に関連情報がありそうな場合:

1. [references/triggers.md](references/triggers.md) の**参照トリガー**を評価（明示指示 or キーワード自動提案）
2. 明示指示なら即起動、自動提案なら「grow-wiki の [[〇〇]] を参照しますか？」と確認
3. `list-pages.sh` で全ページの frontmatter を取得 → 質問のキーワードと title / aliases / synonyms / tags を突合 → 上位 3〜5 件を特定
4. 該当ページを Read（ネストはオプションで 1 段）
5. 回答本文に `[[ページ名]]` で引用、末尾に `📚 参照: [[...]]` で参照元を列挙
6. 情報の陳腐化・矛盾を検出したら**更新提案**（承認後に ingest の update フローへ）

詳細は [references/query-flow.md](references/query-flow.md)。過剰発火回避のルールもそこに記載。

## 不変条件（必ず守る）

- **自動書き込み禁止**: トリガーが発火しても、ユーザー承認なしにファイルを書き換えない
- **YAML frontmatter 必須**: 全 `.md` に [frontmatter-spec](references/frontmatter-spec.md) に従った frontmatter を付ける
- **`[[wikilink]]` 形式のみ**: 相対パス `[text](path.md)` や絶対パスは使わない（再編成でリンク切れを起こすため）
- **出典の明記（必須）**: entity / concept は `## 出典` セクションに `[[source ページ]]` または外部 URL を 1 つ以上記載する。**必ずリンク形式**で（テキストのみの書籍名や「不明」表記は不可）。書籍は Amazon / 出版社公式等の販売サイト URL、記事は公開ページ URL を張る。source-url は frontmatter の `source_url` 必須。lint L6 で warn 検出
- **index.md は自動生成**: 手動編集しない。更新は `rebuild-index.sh` 経由
- **log.md は append-only**: 過去エントリを書き換えない
- **overview.md の全置換は大更新時のみ**: 通常更新では触らない

## 初回起動時

1. 環境変数 `GROW_WIKI_ROOT` が設定されているか確認する（未設定ならスクリプトがエラーメッセージを出して停止する）
2. vault が未初期化なら `bash .skill/assets/init-vault.sh` を実行（既存ファイルは上書きしない、冪等）

## Obsidian での運用

- Obsidian vault は `$GROW_WIKI_ROOT` の親ディレクトリ（例: `GROW_WIKI_ROOT=.../Obsidian Vault/grow-wiki` なら vault は `.../Obsidian Vault`）
- vault 内の `grow-wiki/` サブフォルダが本スキルの管理範囲。vault 内の他のフォルダ（`DailyNotes/` 等）は触らない
- 日本語ファイル名 OK。`[[ファイル名]]` 形式で参照していれば再編成に追従する
- Obsidian のグラフビューで `[[wikilink]]` による関連が可視化される

## 発話による手動操作

| ユーザー発話 | 動作 |
|---|---|
| 「grow-wiki に聞いて」「wiki を見て答えて」 | Q&A 用の参照フロー起動 → 関連ページを特定して回答に引用 |
| 「以前の〇〇の話」「前に書いた〇〇」 | 参照フロー（キーワードから関連ページを探索） |
| 「grow-wiki の lint」 | `lint.sh` を実行して結果を要約表示 |
| 「grow-wiki の index を再生成」 | `rebuild-index.sh` 実行 |
| 「grow-wiki の health check」 | `health-check.sh` で broken link / orphan を報告 |
| 「grow-wiki を初期化」 | `init-vault.sh` 実行（冪等） |
| 「grow-wiki の〇〇ページを更新」 | 該当ページを読み込み → 追記/再生成判断 → プレビュー → 承認 → 書き込み |

## 終了時サマリのフォーマット

ingest 完了時、ユーザーに以下を 1 ブロックで報告：

```
✅ grow-wiki: 保存完了
- 新規: <path1>, <path2>
- 更新: <path3>
- index: <再生成した index.md 一覧>
- lint: ok / warn (<件数>) / error (<件数>)
```
