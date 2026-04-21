# lint ルール

`lint.sh` が実行する 4 つの整合性チェック。各ルールの閾値は**このドキュメントが単一ソース**。`lint.sh` のコメントにも同じ値が書かれているので、変更する場合は両方を揃える。

## ルール一覧

| # | 名前 | 内容 | warn 閾値 | error 閾値 |
|---|---|---|---|---|
| L1 | folder-size | 各ディレクトリ直下のページ数（index.md 除く） | 50 超 | 80 超 |
| L2 | file-length | 各ページの行数／文字数 | 300 行 OR 8000 文字超 | 500 行 OR 15000 文字超 |
| L3 | index-completeness | フォルダ直下の全 .md が同フォルダの index.md 内に `[[wikilink]]` でリストされている | — | 欠落 or 余剰があれば |
| L4 | index-freshness | index.md の `last_updated` より新しいページが存在する／index.md 内のリンクテキストが現ページ title/aliases と不一致 | 鮮度（古い） | リンク不一致 |

## L1: folder-size

### 目的

1 フォルダに多すぎるページがあると探しにくくなる。閾値超過時は [folder-rebalance.md](folder-rebalance.md) に従ってサブフォルダに分割する。

### 実装

- 対象: `WIKI_ROOT` 内の全ディレクトリ（`.skill/` は vault 外なので対象外）
- `<dir>/*.md` のうち `index.md` を除外してカウント
- サブディレクトリ配下のファイルはカウントしない（直下のみ）

### 出力例

```
L1 folder-size:
  ⚠️  sources/conversations: 52 files (warn, threshold 50)
  ❌ concepts: 83 files (error, threshold 80)
```

## L2: file-length

### 目的

wiki 記事は短く保つ。長い記事は節を別ページ（entity/concept）に切り出す。

### 実装

- 対象: 全 `.md`（`index.md` / `overview.md` / `log.md` を含む）
- 行数と文字数の両方を計測、**どちらかが閾値を超えたら該当レベル**

### 出力例

```
L2 file-length:
  ⚠️  concepts/React.md: 312 lines (warn, threshold 300)
  ❌ sources/urls/huge-article.md: 16234 chars (error, threshold 15000)
```

### 長さ超過の対処

- error レベル: ingest 時の書き込みをブロック。節を切り出して別ページ化するようユーザーに提案
- warn レベル: 書き込みは許可、ユーザーには切り出しを提案

## L3: index-completeness

### 目的

各フォルダの `index.md` はそのフォルダ直下の全 `.md` を網羅する。

### 実装

- 対象: vault 内の全ディレクトリの `index.md`
- フォルダ直下の `.md` リスト（index.md 自身と `.` で始まるファイルを除く）を取得
- index.md 内の `[[...]]` 形式 wikilink を抽出
- 双方を突合し、**欠落**（実ファイルがあるのに index に載ってない）と**余剰**（index にあるのに実ファイルがない）を報告

### 出力例

```
L3 index-completeness:
  ❌ concepts/index.md:
    - missing: [[非同期処理]]
    - extra: [[削除済みページ]]
```

### 対処

欠落・余剰ともに `rebuild-index.sh <folder>` で再生成する。ユーザー承認後に実行。

## L4: index-freshness

### 目的

index.md が古いと、新しい情報が vault にあっても発見できない。また index.md 内のリンクテキストが実ページの title と乖離すると混乱する。

### 実装

#### 鮮度チェック（warn）

- 各 `index.md` の frontmatter `last_updated` と、**同フォルダ直下の全 .md の mtime**（または frontmatter `last_updated`）を比較
- index.md より新しいファイルが 1 つでもあれば warn

#### リンク妥当性チェック（error）

- index.md 内の `[[<text>]]` のうち、リンク先ファイルの frontmatter `title` と `aliases` のいずれとも一致しないものを検出
- ファイル名（stem）は一致しているが title が変わっているケースを捕まえる

### 出力例

```
L4 index-freshness:
  ⚠️  entities/index.md: last_updated 2026-03-01, 3 newer pages
  ❌ concepts/index.md:
    - [[古いタイトル]] -> file exists as "新しいタイトル.md" (title: "新しいタイトル")
```

### 対処

- warn: `rebuild-index.sh <folder>` で再生成
- error: ページ名変更が意図通りか確認した上で再生成

## 挙動

### 実行タイミング

- ingest 完了後に自動実行
- ユーザーが「grow-wiki で lint」と発話したら手動実行
- `--check` オプションで read-only 実行（書き込み系の副作用なし）

### 終了コード

| コード | 意味 |
|---|---|
| 0 | 問題なし |
| 1 | warn あり（error なし） |
| 2 | error あり |

### error 時のスキル挙動

- ingest 直後の lint で error が出た場合、ユーザーに通知し、`rebuild-index.sh` 実行を提案（承認後に実行）
- L1 error は `folder-rebalance` を提案
- L2 error はページ分割を提案

### warn 時

- `log.md` に `## [YYYY-MM-DD] lint-warn | <path> | <rule-id>` を append
- ユーザーへの通知はサマリのみ

## 閾値の変更

この lint-rules.md と `scripts/lint.sh` 内の定数の**両方を同じ値に**変更する。
