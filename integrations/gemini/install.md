# Gemini CLI 連携セットアップ

`grow-wiki` を Gemini CLI から使うための手順です。Windows / macOS / Linux いずれでも動きます。

## 前提

- Node.js 20 以上（Gemini CLI がインストール済みなら自動で入っている）
- Gemini CLI（`@google/gemini-cli`）
- このリポジトリを clone 済み

## 1. 環境変数 `GROW_WIKI_ROOT` を設定

vault を保存する Obsidian vault 内のフォルダの**絶対パス**を指定。

### Windows (PowerShell, 永続化)

```powershell
[Environment]::SetEnvironmentVariable("GROW_WIKI_ROOT", "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki", "User")
```

設定後は **PowerShell を開き直す**こと。

### Windows (cmd, 永続化)

```cmd
setx GROW_WIKI_ROOT "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki"
```

### macOS / Linux

`~/.bashrc` や `~/.zshrc` に追加:

```bash
export GROW_WIKI_ROOT="/absolute/path/to/Obsidian Vault/grow-wiki"
```

または Gemini CLI の設定ファイル `~/.gemini/settings.json` の `env` セクション（CLI 全体で有効）:

```json
{
  "env": {
    "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki"
  }
}
```

## 2. スラッシュコマンドをインストール

このリポジトリのルートディレクトリで以下を実行:

```bash
node integrations/gemini/install.mjs
```

これで `~/.gemini/commands/` 配下に以下の 5 つのコマンドファイルが生成されます:

- `wiki-init.toml` — vault 初期化
- `wiki-save.toml` — 会話を保存
- `wiki-url.toml` — URL を取り込み
- `wiki-ask.toml` — 蓄積した情報を参照して回答
- `wiki-lint.toml` — 整合性チェック

別の場所に置きたい場合は引数で指定:

```bash
node integrations/gemini/install.mjs /path/to/custom/commands/dir
```

### Windows での実行例

```powershell
cd C:\path\to\grow-wiki
node integrations\gemini\install.mjs
```

## 3. 初回 vault 初期化

Gemini CLI を起動し、`/wiki-init` を実行:

```
> /wiki-init
```

これで `$GROW_WIKI_ROOT` 配下にディレクトリ構造とテンプレが作成されます（既存ファイルは上書きしない、冪等）。

## 4. 使う

| コマンド | 用途 |
|---|---|
| `/wiki-save` | 現在の会話を `sources/conversations/` に保存 |
| `/wiki-save 〇〇について` | 引数でフォーカスする話題を指定 |
| `/wiki-url <url>` | URL を取り込んで `sources/urls/` に保存 |
| `/wiki-ask <質問>` | 蓄積した情報を参照して回答 |
| `/wiki-lint` | 整合性チェック実行 |

## 注意点

- **書き込み前に必ずプレビューが表示され、ユーザー承認を取ってから保存します**（自動書き込みなし）
- Claude Code 用の SKILL.md にあるキーワード自動検知（「メモっておいて」等）は Gemini CLI では機能しません。**必ず `/wiki-` プレフィックスで明示的に呼んでください**
- リポジトリを別の場所に移動した場合、`node integrations/gemini/install.mjs` を再実行してパスを更新する必要があります（TOML 内に絶対パスが埋め込まれているため）
- `references/*.md` を更新したら、変更を TOML に反映するには `install.mjs` を再実行してください

## トラブルシューティング

### `error: GROW_WIKI_ROOT 環境変数が未設定です` と出る

PowerShell の場合、`setx` 後に PowerShell を**開き直す**必要があります。
`echo $env:GROW_WIKI_ROOT` で値が見えるか確認。

### `/wiki-save` 実行時に Gemini CLI が「シェル実行を承認しますか？」と聞く

これは正常です。`!{...}` 構文ではなく、AI モデルがシェルツールで `node ...js` を実行する都度承認が必要なためです。
信頼できる場合は yes、確認したい場合はコマンド内容を確認してから承認してください。
