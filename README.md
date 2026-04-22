# grow-wiki

会話内容・URL・メモを Obsidian 互換 markdown wiki として継続的に蓄積するための **Claude Code スキル**。

[SamurAIGPT/llm-wiki-agent](https://github.com/SamurAIGPT/llm-wiki-agent) の設計思想を参考に、Obsidian vault 内のサブフォルダへ書き込みます。会話から抽出した情報を sources / entities / concepts の 3 層構造で整理し、`[[wikilink]]` による相互参照、4 種の整合性 lint、フォルダ自動分割まで含めてサポートします。

## 特徴

- **会話 → wiki**: 会話の内容を要約・構造化して markdown として保存（トリガーは「wiki に保存」「メモっておいて」など）
- **URL → wiki**: WebFetch で取得した記事を要約・構造化して保存
- **既存ページ更新**: タイトル/alias 一致で既存ページに追記または再生成
- **自動 `[[wikilink]]` 付与**: 既存ページ名との一致を検出して自動リンク
- **4 種 lint**: ファイル数上限 / ファイル長 / index.md 完全性 / index.md 鮮度・リンク妥当性
- **フォルダ自動分割**: 閾値超過時にトピック別サブフォルダへ再編成（承認付き）
- **ユーザー承認必須**: トリガー発火後もユーザー承認なしには書き込まない

## 前提条件

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview) CLI
- Python 3.8+
- Bash
- Obsidian（閲覧用、任意）

## インストール

### 1. リポジトリを clone

```bash
git clone https://github.com/<your-github-user>/grow-wiki.git
cd grow-wiki
```

### 2. Claude Code スキルとして登録

**ユーザースコープ**（どのディレクトリで起動しても有効、推奨）:

```bash
ln -s "$(pwd)/.skill" ~/.claude/skills/grow-wiki
```

**プロジェクトスコープ**（特定プロジェクト内のみ有効）:

```bash
mkdir -p /path/to/your-project/.claude/skills
ln -s "$(pwd)/.skill" /path/to/your-project/.claude/skills/grow-wiki
```

### 3. Obsidian vault の書き込み先を指定

環境変数 `GROW_WIKI_ROOT` に、Obsidian vault 内の `grow-wiki` サブフォルダを絶対パスで指定します。未設定時は全スクリプトが停止し設定方法を表示します（デフォルト値なし）。

**推奨**: `~/.claude/settings.json` の `env` セクションに追加（Claude Code 全体で有効）。

```json
{
  "env": {
    "GROW_WIKI_ROOT": "/absolute/path/to/YourObsidianVault/grow-wiki"
  }
}
```

手動で実行する場合はシェルで `export`:

```bash
export GROW_WIKI_ROOT="/absolute/path/to/YourObsidianVault/grow-wiki"
```

vault はまだ作っていなくても構いません（次の手順で作成されます）。

### 4. vault 初期化

```bash
bash ~/.claude/skills/grow-wiki/assets/init-vault.sh
```

`$GROW_WIKI_ROOT` に以下の構造が作られます（既存ファイルは上書きしない、冪等）:

```
<GROW_WIKI_ROOT>/
├── index.md              # ルート索引（自動生成）
├── overview.md           # 横断サマリ
├── log.md                # 更新履歴（append-only）
├── sources/
│   ├── conversations/
│   └── urls/
├── entities/
└── concepts/
```

### 5. Obsidian 側の設定（任意）

Obsidian で `$GROW_WIKI_ROOT` の親ディレクトリ（vault ルート）を開きます。既存 vault 内のサブフォルダとして `grow-wiki/` が表示され、`[[wikilink]]` もそのまま認識されます。

## 使い方

Claude Code との会話で次のように発話します。

### 書き込み

- 「grow-wiki に保存」「wiki に追加」 — いまの会話内容を wiki 化
- 「この URL を取り込んで」 — URL から wiki ページを生成
- 「〇〇ページを更新」 — 既存ページに追記または再生成

### 参照（Q&A）

- 「grow-wiki に聞いて」「wiki を見て答えて」 — 蓄積した知識を参照して回答
- 「以前の〇〇の話」「前に書いた〇〇」 — キーワードから関連ページを探して回答に引用
- 質問のキーワードが vault の title / aliases / tags と一致した時は自動で「参照しますか？」と提案（3 文字以上、過剰発火回避あり）

### メンテナンス

- 「grow-wiki で lint」 — 整合性チェックを実行
- 「grow-wiki の index を再生成」 — 各フォルダ index.md を再生成
- 「grow-wiki の health check」 — broken link / orphan を確認

### キーワードによる自動提案

以下のキーワードが会話に現れると「grow-wiki に保存しましょうか？」と提案します。

- 「メモっておいて」「メモしとく」
- 「覚えておいて」「記憶しておいて」
- 「あとで読む」
- 「ブックマーク」「保存しとく」

**書き込みは必ずユーザー承認を経由します。** ingest の前にプレビューが表示され、承認して初めてファイルが作成・更新されます。

## 手動メンテナンス

```bash
# vault 初期化（冪等）
bash ~/.claude/skills/grow-wiki/assets/init-vault.sh

# 全 index.md 再生成
bash ~/.claude/skills/grow-wiki/scripts/rebuild-index.sh

# リンク整合性チェック（broken / orphan）
bash ~/.claude/skills/grow-wiki/scripts/health-check.sh

# lint（4 ルール）
bash ~/.claude/skills/grow-wiki/scripts/lint.sh

# 全ページの frontmatter を JSON 列挙
bash ~/.claude/skills/grow-wiki/scripts/list-pages.sh
```

## Lint ルール

| # | チェック | warn 閾値 | error 閾値 |
|---|---|---|---|
| L1 | フォルダ内項目数（ファイル + サブフォルダ） | 20 | 40 |
| L2 | ファイル長 | 300 行 / 8000 字 | 500 行 / 15000 字 |
| L3 | index.md 完全性 | — | 欠落 or 余剰あり |
| L4 | index.md 鮮度・リンク妥当性 | 古い | リンクテキスト不一致 |
| L5 | subfolder-exclusivity（サブフォルダがあれば直下にページを置かない） | — | 直下にページあり |
| L6 | citation-required（entity/concept に出典、source-url に source_url） | 出典なし | — |

閾値の変更は `.skill/references/lint-rules.md` と `.skill/scripts/lint.sh` を同じ値に揃えます。

## 運用の原則

- **自動書き込み禁止**: トリガー発火後もユーザー承認を経由
- **`[[wikilink]]` 形式のみ**: 相対パスや絶対パスは書かない（Obsidian の自動リンク追従を活かすため）
- **index.md は自動生成**: 手動編集禁止。更新は `rebuild-index.sh` で
- **log.md は append-only**: 過去エントリを書き換えない

詳細は [.skill/SKILL.md](.skill/SKILL.md) と [.skill/references/](.skill/references/) を参照。

## ディレクトリ構成

```
grow-wiki/                  ← このリポジトリ（clone 先）
├── .skill/                 ← Claude Code スキル本体
│   ├── SKILL.md            ← エントリポイント
│   ├── references/         ← 設計ドキュメント 10 本
│   │   ├── frontmatter-spec.md
│   │   ├── triggers.md
│   │   ├── conversation-ingest-flow.md
│   │   ├── url-ingest-flow.md
│   │   ├── update-logic.md
│   │   ├── wikilink-rules.md
│   │   ├── naming-conventions.md
│   │   ├── page-templates.md
│   │   ├── folder-rebalance.md
│   │   └── lint-rules.md
│   ├── scripts/            ← 4 本の bash スクリプト
│   │   ├── list-pages.sh
│   │   ├── health-check.sh
│   │   ├── rebuild-index.sh
│   │   └── lint.sh
│   └── assets/
│       ├── init-vault.sh
│       └── templates/      ← 8 本のページテンプレート
├── README.md
└── LICENSE

<GROW_WIKI_ROOT>/           ← wiki コンテンツの書き込み先（別 Obsidian vault 内）
├── index.md / overview.md / log.md
├── sources/{conversations,urls}/
├── entities/
└── concepts/
```

リポジトリ本体には wiki コンテンツは含みません。wiki は `$GROW_WIKI_ROOT` に個別に蓄積されます。

## ライセンス

MIT. See [LICENSE](LICENSE).
