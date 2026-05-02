# Codex CLI 連携セットアップ

[English](install.en.md) | **日本語**

`grow-wiki` を Codex CLI から使うための手順です。

## 仕組み

Codex CLI は Claude Code の SKILL.md フォーマットと互換のスキル機構を持ちます。
そのため、grow-wiki の `.skill/` ディレクトリをそのまま Codex に登録するだけで動きます。

Codex CLI は以下の優先順位でスキルを検出します（一部抜粋）:

| スコープ | パス |
|---|---|
| USER | `$HOME/.agents/skills/<name>/SKILL.md` |
| REPO | `<repo>/.agents/skills/<name>/SKILL.md` |

このプロジェクトでは USER スコープの symlink を使います。

## 前提

- Node.js 20 以上
- Codex CLI（`@openai/codex`）
- このリポジトリを clone 済み

## 1. 環境変数 `GROW_WIKI_ROOT` を設定

vault の絶対パス。

### Windows (PowerShell, 永続化)

```powershell
[Environment]::SetEnvironmentVariable("GROW_WIKI_ROOT", "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki", "User")
```

### Windows (cmd)

```cmd
setx GROW_WIKI_ROOT "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki"
```

### macOS / Linux

```bash
export GROW_WIKI_ROOT="/absolute/path/to/Obsidian Vault/grow-wiki"
```

`~/.bashrc` / `~/.zshrc` 等に追加して永続化。

## 2. スキルを登録

このリポジトリのルートディレクトリで以下を実行:

```bash
node integrations/codex/install.mjs
```

これで `~/.agents/skills/grow-wiki -> <repo>/.skill` の symlink が作られます。

### Windows での挙動

Node.js の `fs.symlinkSync(src, dest, 'dir')` は **Windows では directory junction** を作るため、
**管理者権限は不要**です。普通の PowerShell から実行できます。

```powershell
cd C:\path\to\grow-wiki
node integrations\codex\install.mjs
```

## 3. 初回 vault 初期化

Codex CLI を起動して以下のコマンドで vault を初期化:

```
$ node ~/.agents/skills/grow-wiki/scripts/init-vault.js
```

または Codex のチャットで「grow-wiki を初期化して」と発話すると、SKILL.md の指示に従って Codex が
`init-vault.js` を実行します（実行前に承認確認あり）。

## 4. 使う

Codex CLI の SKILL.md トリガーは 2 種類:

- **明示呼び出し**: `/skills grow-wiki` または `$grow-wiki`
- **暗黙呼び出し**: SKILL.md の `description` に一致する発話で自動起動
  - 例: 「grow-wiki に保存して」「wiki に追加」「メモっておいて」「あとで読む」

実際の操作は SKILL.md の指示に従って Codex が行います:

| 発話例 | 動作 |
|---|---|
| 「grow-wiki に保存」 | 現在の会話を `sources/conversations/` に保存 |
| 「この URL を取り込んで <url>」 | URL を `sources/urls/` に保存 |
| 「grow-wiki に聞いて: <質問>」 | 蓄積した情報を参照して回答 |
| 「grow-wiki の lint」 | 整合性チェック |

## 注意点

- **書き込み前に必ずプレビューが表示され、ユーザー承認を取ってから保存します**（自動書き込みなし）
- 暗黙呼び出しを無効化したい場合は Codex の設定で `allow_implicit_invocation: false` を指定
- リポジトリを別の場所に移動した場合、symlink を貼り直す必要があります（`install.mjs` を再実行）

## アンインストール

```bash
# macOS / Linux
unlink ~/.agents/skills/grow-wiki

# Windows (PowerShell)
Remove-Item -Path "$env:USERPROFILE\.agents\skills\grow-wiki"
```

## トラブルシューティング

### Codex がスキルを検出しない

- `~/.agents/skills/grow-wiki/SKILL.md` が存在するか確認: `ls ~/.agents/skills/grow-wiki/SKILL.md`
- symlink が壊れていないか: `readlink ~/.agents/skills/grow-wiki`
- Codex CLI を再起動

### `error: GROW_WIKI_ROOT 環境変数が未設定です`

PowerShell の場合、`setx` 後に PowerShell を**開き直す**必要があります。
