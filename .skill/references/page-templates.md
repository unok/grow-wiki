# ページテンプレート

各 type の markdown テンプレート。実ファイルは `.skill/assets/templates/` に配置。

プレースホルダ:
- `{{title}}` — ページタイトル
- `{{date}}` — YYYY-MM-DD 形式の今日の日付
- `{{source_url}}` / `{{fetched_at}}` / `{{author}}` / `{{published_at}}` / `{{site_name}}` — URL ソース用
- `{{session_id}}` — 会話セッション識別子
- `{{entity_kind}}` — `person` / `tool` / `product` / `org`
- `{{folder_title}}` — folder-index.md 用のフォルダ名
- `{{page_list}}` / `{{subfolder_list}}` / `{{sources_conversations_list}}` 等 — rebuild-index.sh が埋める

## 使用箇所

| テンプレ | 用途 | 埋める主体 |
|---|---|---|
| `source-conversation.md` | 会話ソース新規作成 | conversation-ingest-flow |
| `source-url.md` | URL ソース新規作成 | url-ingest-flow |
| `entity.md` | エンティティ新規作成 | ingest 時の entity 抽出フェーズ |
| `concept.md` | 概念新規作成 | ingest 時の concept 抽出フェーズ |
| `folder-index.md` | 各フォルダの index.md | rebuild-index.sh |
| `root-index.md` | vault ルート index.md | rebuild-index.sh |
| `overview.md` | vault ルート overview.md | init-vault.sh（以降は大更新時のみ手動） |
| `log.md` | 更新履歴の初期化 | init-vault.sh |

## テンプレート本文の原則

- 見出しは `## 背景` `## 要点` `## 詳細` `## 関連` など決まったセクションで統一
- `<!-- コメント -->` で書くべき内容を案内
- フロントマター直下に本文が来るようブランク行 1 行挟む
- 本文中の `[[wikilink]]` は積極的に付与する（既知用語を見つけたら囲む）

## テンプレに載っていない節を追加する場合

自由に追加してよいが、ファイル長が 300 行または 8000 文字を超えると lint L2 が warn を出す。その場合は関連節を別ページ（entity/concept）に切り出すことを検討する。
