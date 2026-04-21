# フォルダ自動分割 (folder-rebalance)

各ディレクトリ直下のページ数が閾値を超えた場合、トピック別サブフォルダに分割する。LLM のセマンティック判断が必要なため**スクリプト化せず**、スキルの手続きとして運用する。

## 発火条件

- L1 lint (`lint.sh`) が warn（20 超）または error（40 超）を返したフォルダ
- ユーザーから「フォルダを整理して」「rebalance して」と明示指示があった時

## 手続き

### 1. 現状分析

```
.skill/scripts/list-pages.sh <target-folder>
```

対象フォルダ配下の全ページの frontmatter を取得。各ページの tags を集計する。

### 2. クラスタ候補の生成

以下のロジックで分類案を作る（LLM が実施）:

1. tags の出現頻度を集計。上位 10-20 個を候補タグとする
2. 各ページのタグセット間で **Jaccard 類似度** を計算
   - `Jaccard(A, B) = |A ∩ B| / |A ∪ B|`
3. 閾値 0.3 以上でクラスタリング（単純な貪欲法で OK）
4. 1 クラスタあたり 10〜25 件になるように粒度を調整
5. どのクラスタにも入らない or 小クラスタ（3件未満）は `misc/` へ

### 3. サブフォルダ名

- 代表タグを日本語でそのまま使う（`パフォーマンス/`, `React/`, `データ分析/`）
- [naming-conventions.md](naming-conventions.md) のフォルダ名ルールに従う
- 既存サブフォルダと名前が衝突する場合は文脈サフィックス

### 4. 提案の提示

ユーザーに以下の形式で提案:

```
📂 folder-rebalance 提案: sources/conversations (54 files)

クラスタ候補:
  React/ (12 files)
    - [[React Hooks の useMemo]] / [[useCallback 深堀り]] / ...
  パフォーマンス/ (9 files)
    - [[CLS 最適化]] / [[LCP 改善]] / ...
  データ分析/ (8 files)
    - [[SQL window function]] / ...
  misc/ (25 files)
    - （単発トピック）

この分割で良いですか？ 変更があれば指示してください。
```

### 5. 移動実行

承認後:

1. 事前 snapshot: 移動前に `health-check.sh` を実行して broken link = 0 を確認
2. `mkdir -p <new-subfolder>` で各サブフォルダを作成
3. ファイルを `mv` で移動（一括ではなく 1 ファイルずつ log に記録可能な形で）
4. サブフォルダの `index.md` を生成: `.skill/scripts/rebuild-index.sh <subfolder>`
5. 元フォルダの `index.md` を再生成: `.skill/scripts/rebuild-index.sh <parent>`
6. ルート `index.md` を再生成: `.skill/scripts/rebuild-index.sh`

### 6. 事後検証

1. `health-check.sh` を再実行 → broken link = 0 を確認
2. `lint.sh` を実行 → L1 warn/error が解消していることを確認
3. `log.md` に以下の 1 行を append:

```
## [YYYY-MM-DD] rebalance | <target-folder> | N files → M subfolders (<names>)
```

## リンク整合性

- `[[ファイル名]]` 形式のみ使っていれば Obsidian はファイル移動に追従する
- **相対パス `[text](path.md)` を使っていたら壊れる** — wikilink-rules.md で禁止している通り、使わない
- スキルが独自に `mv` した場合も、ファイル名が変わらない限りリンクは壊れない

## 失敗時のロールバック

移動中に health-check が error を返したら:

1. ユーザーに報告
2. 移動済みファイルを元のパスに戻すか確認
3. 戻す場合は `mv` で復元、index.md を再生成

## 頻度と運用

- 無闇に実行しない。lint L1 が警告を出してから判断
- 1 度の rebalance で複数フォルダを同時に触らない（リスク分散）
- ユーザーが「rebalance しないで」と意思表示した場合は、そのセッションでは再提案しない

## misc/ の扱い

- `misc/` は必ず 1 つだけ。ネストしない
- misc/ が 20 件に達したら、もう一度 rebalance を提案（misc 内での再クラスタリング）
- 完全に単発のページは misc/ に残ることを許容する
