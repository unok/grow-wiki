# grow-wiki

[English](README.en.md) | **日本語**

会話内容・URL・メモを Obsidian 互換 markdown wiki として継続的に蓄積するためのスキル。**Claude Code / Gemini CLI / Codex CLI** から利用可能。

[SamurAIGPT/llm-wiki-agent](https://github.com/SamurAIGPT/llm-wiki-agent) の設計思想を参考に、Obsidian vault 内のサブフォルダへ書き込みます。会話から抽出した情報を sources / entities / concepts の 3 層構造で整理し、`[[wikilink]]` による相互参照、7 種の整合性 lint、フォルダ自動分割まで含めてサポートします。

## 特徴

- **会話 → wiki**: 会話の内容を要約・構造化して markdown として保存
- **URL → wiki**: WebFetch で取得した記事を要約・構造化して保存
- **既存ページ更新**: タイトル/alias 一致で既存ページに追記または再生成
- **自動 `[[wikilink]]` 付与**: 既存ページ名との一致を検出して自動リンク
- **7 種 lint**: フォルダ規模 / ファイル長 / index.md 完全性 / index.md 鮮度・リンク妥当性 / subfolder-exclusivity / citation-required / misc-flat
- **フォルダ自動分割**: 閾値超過時にトピック別サブフォルダへ再編成（承認付き）
- **ユーザー承認必須**: トリガー発火後もユーザー承認なしには書き込まない
- **マルチ CLI 対応**: 同じスクリプトと同じ手順書（references）を 3 つの CLI で共有

## 対応 CLI とサポート機能

| CLI | スキル形式 | 自動トリガー | 明示呼び出し | セットアップ |
|---|---|---|---|---|
| Claude Code | `~/.claude/skills/grow-wiki/SKILL.md` | ✅ frontmatter のキーワード検知 | 発話で誘導 | symlink |
| Codex CLI | `~/.agents/skills/grow-wiki/SKILL.md` | ✅ description マッチで暗黙起動 | `/skills grow-wiki` / `$grow-wiki` | symlink |
| Gemini CLI | `~/.gemini/commands/wiki-*.toml` | ❌（明示コマンドのみ） | `/wiki-save` / `/wiki-url` / `/wiki-ask` / `/wiki-lint` / `/wiki-init` | TOML 生成 |

スクリプト（`lint.js` / `list-pages.js` / `rebuild-index.js` / `health-check.js` / `init-vault.js`）と
手順書（`.skill/references/*.md`）は **すべての CLI で共通**です。

## 前提条件

- **Node.js 20 以上**（Gemini CLI / Codex CLI を入れた時点で標準で入っている。`node --version` で確認）
- いずれかの対応 CLI（Claude Code / Codex CLI / Gemini CLI）
- Obsidian（閲覧用、任意）

Python・Bash は **不要**になりました（v0.1 以降、TypeScript / Node.js ベース）。

## 共通セットアップ

### 1. リポジトリを clone

```bash
git clone https://github.com/<your-github-user>/grow-wiki.git
cd grow-wiki
```

### 2. 環境変数 `GROW_WIKI_ROOT` を設定

vault の書き込み先（Obsidian vault 内のサブフォルダの**絶対パス**）を指定。未設定時は全スクリプトが停止し設定方法を表示します（デフォルト値なし）。

#### Windows (PowerShell, 永続化)

```powershell
[Environment]::SetEnvironmentVariable("GROW_WIKI_ROOT", "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki", "User")
```

設定後は **PowerShell を開き直す**こと。

#### Windows (cmd)

```cmd
setx GROW_WIKI_ROOT "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki"
```

#### macOS / Linux (シェル)

```bash
export GROW_WIKI_ROOT="/absolute/path/to/YourObsidianVault/grow-wiki"
```

`~/.bashrc` / `~/.zshrc` 等に追加して永続化。

#### 各 CLI の設定ファイル経由（推奨）

| CLI | 設定ファイル |
|---|---|
| Claude Code | `~/.claude/settings.json` の `env` セクション |
| Gemini CLI | `~/.gemini/settings.json` の `env` セクション |
| Codex CLI | OS 環境変数を使う |

例（Claude Code / Gemini CLI 共通の JSON 形式）:

```json
{
  "env": {
    "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki"
  }
}
```

### 3. CLI 別のスキル登録

それぞれの CLI 用に下記のセクションを参照。

## CLI 別セットアップ

### Claude Code

クロスプラットフォーム（Windows / macOS / Linux）対応のインストーラ:

```bash
node integrations/claude/install.mjs
```

これで `~/.claude/skills/grow-wiki -> <repo>/.skill` の symlink（Windows では directory junction）が作られます。
プロジェクトスコープに置きたい場合は出力先を引数で指定:

```bash
node integrations/claude/install.mjs /path/to/your-project/.claude/skills
```

shell から手動で symlink したい場合（macOS / Linux）:

```bash
ln -s "$(pwd)/.skill" ~/.claude/skills/grow-wiki
```

### Codex CLI

```bash
node integrations/codex/install.mjs
```

詳細は [integrations/codex/install.md](integrations/codex/install.md)。

### Gemini CLI

```bash
node integrations/gemini/install.mjs
```

詳細は [integrations/gemini/install.md](integrations/gemini/install.md)。

### 4. vault 初期化

```bash
node ~/.claude/skills/grow-wiki/scripts/init-vault.js
```

(Codex CLI の場合は `~/.agents/skills/grow-wiki/scripts/init-vault.js`、または直接 `node <repo>/.skill/scripts/init-vault.js`。)

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

### Claude Code / Codex CLI（自動トリガー対応）

会話で次のように発話すれば、SKILL.md の指示に従って AI が動きます。

#### 書き込み

- 「grow-wiki に保存」「wiki に追加」 — いまの会話内容を wiki 化
- 「この URL を取り込んで」 — URL から wiki ページを生成
- 「〇〇ページを更新」 — 既存ページに追記または再生成

#### 参照（Q&A）

- 「grow-wiki に聞いて」「wiki を見て答えて」 — 蓄積した知識を参照して回答
- 「以前の〇〇の話」「前に書いた〇〇」 — キーワードから関連ページを探して回答に引用

#### キーワードによる自動提案

以下のキーワードが会話に現れると「grow-wiki に保存しましょうか？」と提案します。

- 「メモっておいて」「メモしとく」
- 「覚えておいて」「記憶しておいて」
- 「あとで読む」
- 「ブックマーク」「保存しとく」

#### メンテナンス

- 「grow-wiki で lint」 — 整合性チェックを実行
- 「grow-wiki の index を再生成」 — 各フォルダ index.md を再生成
- 「grow-wiki の health check」 — broken link / orphan を確認

### Gemini CLI（明示コマンド）

Gemini CLI は自動トリガーをサポートしないため、必ず `/wiki-` プレフィックスで明示的に呼びます。

| コマンド | 動作 |
|---|---|
| `/wiki-init` | vault 初期化 |
| `/wiki-save` | 現在の会話を保存 |
| `/wiki-save 〇〇について` | 引数でフォーカスする話題を指定 |
| `/wiki-url <url>` | URL を取り込み |
| `/wiki-ask <質問>` | 蓄積した情報を参照して回答 |
| `/wiki-lint` | 整合性チェック |

**書き込みは必ずユーザー承認を経由します。** ingest の前にプレビューが表示され、承認して初めてファイルが作成・更新されます。

## 手動メンテナンス（CLI 非依存）

```bash
# vault 初期化（冪等）
node <repo>/.skill/scripts/init-vault.js

# 全 index.md 再生成
node <repo>/.skill/scripts/rebuild-index.js

# リンク整合性チェック（broken / orphan）
node <repo>/.skill/scripts/health-check.js

# lint（L1〜L7 の 7 ルール）
node <repo>/.skill/scripts/lint.js

# 全ページの frontmatter を JSON 列挙
node <repo>/.skill/scripts/list-pages.js
```

`<repo>` は clone 先のパス、または symlink 経由で `~/.claude/skills/grow-wiki` / `~/.agents/skills/grow-wiki`。

## Lint ルール

| # | チェック | warn 閾値 | error 閾値 |
|---|---|---|---|
| L1 | フォルダ内項目数（ファイル + サブフォルダ） | 20 | 40 |
| L2 | ファイル長 | 300 行 / 8000 字 | 500 行 / 15000 字 |
| L3 | index.md 完全性 | — | 欠落 or 余剰あり |
| L4 | index.md 鮮度・リンク妥当性 | 古い | リンクテキスト不一致 |
| L5 | subfolder-exclusivity（サブフォルダがあれば直下にページを置かない） | — | 直下にページあり |
| L6 | citation-required（entity/concept に出典、source-url に source_url） | 出典なし | — |
| L7 | misc-flat（misc/etc/others 下にサブフォルダを作らない） | — | サブフォルダあり |

### なぜこのチェックを入れるか

- **L1 folder-size** — 1 フォルダに並ぶ項目数が多すぎると目的のページを探しにくくなる。サブフォルダに分けても「見える項目数」は減らないので、**ファイル + サブフォルダの合計**で制限する。閾値を超えたら [folder-rebalance](.skill/references/folder-rebalance.md) でトピック別に分割する
- **L2 file-length** — wiki 記事は短く保つほうが再利用性が高い。長くなるのは複数トピックが混ざっているか、本来別ページとして切り出すべき節が膨らんだサイン。error レベルに達したら節を entity / concept として分離する
- **L3 index-completeness** — 各フォルダの `index.md` は「そのフォルダ直下の全ページを網羅する」という約束で自動生成されている。欠落（載ってないページがある）や余剰（削除済みのページへのリンクが残る）は整合性違反で、探索時の迷子・broken link の温床になる
- **L4 index-freshness** — index.md の `last_updated` より新しいページがある、あるいは index 内のリンクテキストが現在の `title` / `aliases` と食い違うと、新しい情報が vault にあっても発見できない。タイトル変更後の再生成漏れを検出する
- **L5 subfolder-exclusivity** — サブフォルダがあるフォルダの直下にもページを残すと、同じ階層で「サブフォルダ側も直下も見なければならない」状態になり発見性が半減する。rebalance したら**全部サブフォルダへ移動**（該当なしは misc へ）を強制する
- **L6 citation-required** — 出典のない情報は wiki として信頼できず、後から裏付けも取れない。会話は `[[source ページ]]`、書籍は販売サイト URL（Amazon / 出版社公式等）、記事は公開ページ URL を張る。リンクがあれば後日 health-check で有効性を機械チェックできる余地も残る
- **L7 misc-flat** — `misc` / `etc` / `others` は「分類できなかったもの」の雑多置き場。中で階層化すると「雑多の中の雑多」になり、存在価値を失う。肥大化したら **misc 内で再分類するのではなく、親フォルダ側に新カテゴリを作って**該当ページを引き上げる

閾値の変更は `.skill/references/lint-rules.md` と `.skill/scripts/src/lint.ts` を同じ値に揃え、`pnpm build` で再ビルドします。

## 運用の原則

- **自動書き込み禁止**: トリガー発火後もユーザー承認を経由
- **`[[wikilink]]` 形式のみ**: 相対パスや絶対パスは書かない（Obsidian の自動リンク追従を活かすため）
- **index.md は自動生成**: 手動編集禁止。更新は `node .skill/scripts/rebuild-index.js` で
- **log.md は append-only**: 過去エントリを書き換えない

詳細は [.skill/SKILL.md](.skill/SKILL.md) と [.skill/references/](.skill/references/) を参照。

## 開発（TypeScript ビルド）

スクリプトは TypeScript で書かれ、esbuild で `.js` にバンドル（js-yaml 同梱）。
配布物（`.skill/scripts/*.js`）は repo にコミット済みなので、エンドユーザーは `npm install` 不要です。
編集する場合のみ:

```bash
pnpm install        # devDeps（typescript, esbuild, js-yaml, @types/node）
pnpm build          # .skill/scripts/src/*.ts → .skill/scripts/*.js
pnpm typecheck      # tsc --noEmit
```

ビルド後は `.js` ファイルもコミットしてプッシュ。

## ディレクトリ構成

```
grow-wiki/                      ← このリポジトリ（clone 先）
├── .skill/                     ← スキル本体（Claude Code / Codex CLI で symlink 利用）
│   ├── SKILL.md                ← エントリポイント（frontmatter で自動トリガー）
│   ├── references/             ← 設計ドキュメント（全 CLI 共通の手順書）
│   │   ├── frontmatter-spec.md
│   │   ├── triggers.md
│   │   ├── conversation-ingest-flow.md
│   │   ├── url-ingest-flow.md
│   │   ├── update-logic.md
│   │   ├── wikilink-rules.md
│   │   ├── naming-conventions.md
│   │   ├── page-templates.md
│   │   ├── folder-rebalance.md
│   │   ├── lint-rules.md
│   │   └── query-flow.md
│   ├── scripts/                ← Node.js 配布物（TypeScript からビルド）
│   │   ├── src/                ← TypeScript ソース（編集対象）
│   │   ├── package.json        ← {"type": "commonjs"}（実行時の隔離用）
│   │   ├── lint.js             ← node .skill/scripts/lint.js で実行
│   │   ├── list-pages.js
│   │   ├── health-check.js
│   │   ├── rebuild-index.js
│   │   └── init-vault.js
│   └── assets/
│       └── templates/          ← 8 本のページテンプレート
├── integrations/
│   ├── claude/                 ← Claude Code 統合
│   │   └── install.mjs         ← ~/.claude/skills/grow-wiki への symlink 作成
│   ├── codex/                  ← Codex CLI 統合
│   │   ├── install.mjs         ← ~/.agents/skills/grow-wiki への symlink 作成
│   │   └── install.md
│   └── gemini/                 ← Gemini CLI 統合
│       ├── install.mjs         ← ~/.gemini/commands/wiki-*.toml を生成
│       ├── install.md
│       └── templates/          ← TOML テンプレート（プレースホルダ展開）
├── package.json                ← devDeps: typescript, esbuild, js-yaml, @types/node
├── tsconfig.json
├── scripts/
│   └── build.mjs               ← esbuild ビルドスクリプト（pnpm build）
├── README.md                   ← 日本語（主）
├── README.en.md                ← English
└── LICENSE

<GROW_WIKI_ROOT>/               ← wiki コンテンツの書き込み先（別 Obsidian vault 内）
├── index.md / overview.md / log.md
├── sources/{conversations,urls}/
├── entities/
└── concepts/
```

リポジトリ本体には wiki コンテンツは含みません。wiki は `$GROW_WIKI_ROOT` に個別に蓄積されます。

## ライセンス

MIT. See [LICENSE](LICENSE).
