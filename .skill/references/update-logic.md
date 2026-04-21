# 更新ロジック

既存ページを更新する際の追記/再生成の判断基準と記録フォーマット。

## 追記 vs 再生成の判断

### 追記（append）を選ぶ

以下の全てを満たす場合:

- 新情報が既存記述と矛盾しない
- 既存の構造（見出し・節）を壊さない
- 追記量が既存本文の半分以下
- 既存 `status: stable` でも追記は OK

### 再生成（regenerate）を選ぶ

以下のいずれかに当たる場合:

- 新情報が既存と矛盾する（古い記述を置き換える必要あり）
- 既存の構造が古く、見直しが必要
- 追記量が既存本文を超える（倍増レベル）
- ユーザーが明示的に「書き直して」と指示

再生成時でも frontmatter の `created` は維持。`last_updated` のみ更新。

## 書き換え禁止フィールド

- `created` — 作成日は不変
- `type` — type 変更は原則しない（必要ならページを移動 + 新規作成の方が明確）
- `status: stable` → `draft` への降格（昇格は OK）

## 追記の実装

```
1. 既存ファイルを Read
2. 適切な節を特定（`## 要点` に追加するか、新規節を足すか）
3. 追記内容の diff をユーザーに提示して承認
4. Edit ツールで部分更新
5. frontmatter の `last_updated` を今日に更新
6. tags / related に新規項目があれば追加（重複禁止）
```

## 再生成の実装

```
1. 既存ファイルを Read、有用な情報を保持
2. テンプレから再構築、既存 frontmatter の created/session_id/source_url 等を引き継ぐ
3. 新旧の diff をユーザーに提示して承認
4. Write ツールで全置換
5. `last_updated` を今日に更新
```

## log.md への記録

全ての更新は `log.md` に append する。フォーマット:

```
## [YYYY-MM-DD] update | <path> | <summary>
```

例:

```
## [2026-04-20] update | concepts/React Hooks.md | useMemo の新しい注意点を追記
## [2026-04-20] regenerate | entities/Anthropic.md | 会社概要を最新情報で再生成
```

## 既存ページが見つからない場合

`list-pages.sh` の結果にマッチするページがなければ新規作成フロー。命名規則は [naming-conventions.md](naming-conventions.md)。

## 競合・マージ

複数のソースから同一 concept に情報が流れ込んだ場合:

1. 節ごとに出典を明示する（`<!-- [[source ページ]] より -->` コメントで記録可）
2. 矛盾があれば新しいソースを優先し、古い記述は `## 履歴` 節に退避
3. どちらを採るか判断に迷ったらユーザーに聞く

## tags の更新方針

- 新規追加した tags は既存の命名（日本語/英語）に揃える
- 似た意味の tags が重複した場合（`React` と `リアクト`）はユーザーに統合を提案
- tags は最大 10 個程度。それ以上はノイズになる

## related の更新方針

- 新規 wikilink が本文に現れたら `related` に追加
- 既に related にあるリンクは重複させない
- related の順序は出現頻度が高い順
