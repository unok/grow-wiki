# lint ルール

`lint.sh` が実行する 4 つの整合性チェック。各ルールの閾値は**このドキュメントが単一ソース**。`lint.sh` のコメントにも同じ値が書かれているので、変更する場合は両方を揃える。

## ルール一覧

| # | 名前 | 内容 | warn 閾値 | error 閾値 |
|---|---|---|---|---|
| L1 | folder-size | 各ディレクトリ直下の項目数（.md ファイル + サブフォルダ、index.md 除く） | 20 超 | 40 超 |
| L2 | file-length | 各ページの行数／文字数 | 300 行 OR 8000 文字超 | 500 行 OR 15000 文字超 |
| L3 | index-completeness | フォルダ直下の全 .md が同フォルダの index.md 内に `[[wikilink]]` でリストされている | — | 欠落 or 余剰があれば |
| L4 | index-freshness | index.md の `last_updated` より新しいページが存在する／index.md 内のリンクテキストが現ページ title/aliases と不一致 | 鮮度（古い） | リンク不一致 |
| L5 | subfolder-exclusivity | サブフォルダが 1 つでも存在するディレクトリの直下には、index.md（と root の overview/log/README）以外のページを置いてはいけない | — | 直下にページあり |
| L6 | citation-required | entity / concept は `## 出典` セクションに `[[source ページ]]` または外部 URL を 1 つ以上記載。source-url は frontmatter の `source_url` が必須 | 出典なし | — |

## L1: folder-size

### 目的

1 フォルダに多すぎるページがあると探しにくくなる。閾値超過時は [folder-rebalance.md](folder-rebalance.md) に従ってサブフォルダに分割する。

### 実装

- 対象: `WIKI_ROOT` 内の全ディレクトリ（`.skill/` は vault 外なので対象外）
- 直下の `.md` ファイル（`index.md` 除く）+ 直下のサブフォルダ数を合計
- **サブフォルダ配下のファイルは数に含めない**（直下の項目数のみ）
- 目的: 1 フォルダに並ぶ項目数を抑えて探索性を保つ。サブフォルダに分けても「見える項目数」は減らないので合計で制限する

### 出力例

```
L1 folder-size:
  ⚠️  sources/conversations/: 22 items (18 files + 4 subfolders, warn, threshold 20)
  ❌ concepts/: 43 items (5 files + 38 subfolders, error, threshold 40)
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

## L5: subfolder-exclusivity

### 目的

サブフォルダを作ったら、そのフォルダ直下にはページを残さず全てをサブフォルダに入れる。親直下とサブフォルダ両方にページがあると、どこを見ればよいか分散して発見性が落ちる。folder-rebalance の結果を強制する lint。

### 実装

- 対象: `WIKI_ROOT` 内の全ディレクトリ
- そのディレクトリが**サブフォルダを 1 つ以上**持つかを確認
- サブフォルダがある場合、直下の `.md` から `index.md` / `overview.md` / `log.md` / `README.md` を除いた残りが 0 であること
- 残っていれば error

### 出力例

```
L5 subfolder-exclusivity:
  ❌ concepts/: サブフォルダが存在するのに直下に 3 ページある
     (React, useMemo, useCallback)
     → これらを React/ などのサブフォルダへ移動、該当しないものは misc/ へ
```

### 対処

- [folder-rebalance.md](folder-rebalance.md) の手順で、直下のページをクラスタに分類してサブフォルダへ移動
- どのクラスタにも入らないページは `misc/` サブフォルダに入れる
- 移動後に `rebuild-index.sh` で全 index.md を再生成、`health-check.sh` で broken link = 0 を確認

## L6: citation-required

### 目的

何らかの情報源から派生したページ（entity / concept / source-url）は、その出典を必ず明記する。出典のない情報は wiki としての信頼性を欠き、再確認もできなくなる。

### 実装

- 対象: 全 `.md`（`index` / `overview` / `log` / `README` 除く）
- type 別:
  - `source-url`: frontmatter の `source_url` が空または未設定なら warn
  - `entity` / `concept`: 本文に `## 出典` / `## Sources` / `## References` / `## 参考` のいずれかの見出しがあり、そのセクション内に `[[...]]` または `http(s)://...` が 1 つ以上あること（HTML コメント `<!-- ... -->` 内は除外）
  - `source-conversation`: 会話自体が一次ソースのため必須ではない（外部資料を参照する場合は推奨）

### 出力例

```
L6 citation-required:
  ⚠️  concepts/React Hooks.md: '## 出典' セクションが見つからない
  ⚠️  entities/Anthropic.md: '## 出典' セクションにリンク/URL がない
  ⚠️  sources/urls/article.md: frontmatter の source_url が空
```

### 対処

- **新規作成時**: テンプレの `## 出典` セクションに元となった `[[source-conversation ページ]]` や URL を必ず記載
- **既存ページ**: 派生元がはっきり思い出せない場合でも、関連する `[[...]]` を 1 つでも付ける（完全に不明なら `## 出典` に「不明（本人記憶）」と書いて明示）
- **source-url**: 取得失敗で draft になっている場合でも、`source_url` は frontmatter に必ず記録する

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
