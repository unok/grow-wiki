# frontmatter 仕様

全ページの YAML frontmatter 定義。

## 共通必須

| フィールド | 型 | 説明 |
|---|---|---|
| `title` | string | ページタイトル。表示用、ファイル名と別管理 |
| `type` | enum | `source-conversation` / `source-url` / `entity` / `concept` のいずれか |
| `tags` | list<string> | 分類タグ。日本語 OK。fold-rebalance のクラスタ判定に使う |
| `created` | date (YYYY-MM-DD) | 作成日 |
| `last_updated` | date (YYYY-MM-DD) | 最終更新日。更新時は必ず書き換える |

## 共通任意

| フィールド | 型 | 説明 |
|---|---|---|
| `aliases` | list<string> | 別名。wikilink 解決の一致判定に使う |
| `related` | list<`[[link]]`> | 関連ページ。Obsidian で backlink 強化 |
| `status` | enum | `draft` / `stable`。デフォルト `draft` |

## type 別の追加フィールド

### source-url

| フィールド | 必須 | 型 | 説明 |
|---|---|---|---|
| `source_url` | ○ | string (URL) | 元 URL |
| `fetched_at` | ○ | date-time (ISO8601) | 取得日時 |
| `author` | | string | 著者 |
| `published_at` | | date | 公開日 |
| `site_name` | | string | サイト名 |

### source-conversation

| フィールド | 型 | 説明 |
|---|---|---|
| `session_id` | string | 会話セッション識別子（あれば） |
| `participants` | list<string> | 参加者 |

### entity

| フィールド | 型 | 説明 |
|---|---|---|
| `entity_kind` | enum | `person` / `tool` / `product` / `org` |
| `canonical_name` | string | 正式名称。`title` と異なる場合に記載 |

### concept

| フィールド | 型 | 説明 |
|---|---|---|
| `parent` | `[[link]]` | 上位概念 |
| `synonyms` | list<string> | 同義語 |

## 具体例

### source-conversation

```yaml
---
title: "React Hooks の useMemo と useCallback の使い分け"
type: source-conversation
tags: [React, hooks, パフォーマンス]
created: 2026-04-20
last_updated: 2026-04-20
aliases: []
related: ["[[React Hooks]]", "[[useMemo]]", "[[useCallback]]"]
status: draft
session_id: ""
participants: ["user", "claude"]
---
```

### source-url

```yaml
---
title: "Why React Re-Renders"
type: source-url
tags: [React, rendering, 最適化]
created: 2026-04-20
last_updated: 2026-04-20
aliases: []
related: ["[[React]]", "[[Virtual DOM]]"]
status: stable
source_url: "https://example.com/why-react-rerenders"
fetched_at: 2026-04-20T13:42:00+09:00
author: "Josh W. Comeau"
published_at: 2023-08-15
site_name: "joshwcomeau.com"
---
```

### entity

```yaml
---
title: "Anthropic"
type: entity
tags: [AI企業]
created: 2026-04-20
last_updated: 2026-04-20
aliases: ["アンソロピック"]
related: ["[[Claude]]"]
status: stable
entity_kind: org
canonical_name: "Anthropic PBC"
---
```

### concept

```yaml
---
title: "React Hooks"
type: concept
tags: [React, hooks]
created: 2026-04-20
last_updated: 2026-04-20
aliases: ["Hooks"]
related: ["[[useMemo]]", "[[useCallback]]", "[[useEffect]]"]
status: stable
parent: "[[React]]"
synonyms: ["フック"]
---
```

## 値の制約

- `tags` / `aliases` / `synonyms` の要素は空文字不可
- `related` / `parent` は `[[...]]` 形式の文字列。リンク先ファイルは実在する必要がある
- `last_updated` は `created` より前にならない
- `status` の初期値は `draft`。ユーザーが「確定」を示した段階で `stable` に変更

## lint での扱い

- frontmatter 欠落 → L3（index.md 完全性）の前に `health-check.js` で検出され error
- 必須フィールド欠落 → `list-pages.js` 段階で検出し、スキル側が error 通知
