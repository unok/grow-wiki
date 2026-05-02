# Codex CLI integration setup

**English** | [日本語](install.md)

Steps to use `grow-wiki` from Codex CLI.

## How it works

Codex CLI has a skill mechanism compatible with the Claude Code SKILL.md format.
So registering grow-wiki's `.skill/` directory directly with Codex is enough to make it work.

Codex CLI looks up skills in this order of precedence (excerpt):

| Scope | Path |
|---|---|
| USER | `$HOME/.agents/skills/<name>/SKILL.md` |
| REPO | `<repo>/.agents/skills/<name>/SKILL.md` |

This project uses a USER-scope symlink.

## Prerequisites

- Node.js 20 or later
- Codex CLI (`@openai/codex`)
- This repository cloned locally

## 1. Set the `GROW_WIKI_ROOT` environment variable

The absolute path of your vault.

### Windows (PowerShell, persistent)

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

Add to `~/.bashrc` / `~/.zshrc` etc. for persistence.

## 2. Register the skill

From the root directory of this repository:

```bash
node integrations/codex/install.mjs
```

This creates the symlink `~/.agents/skills/grow-wiki -> <repo>/.skill`.

### Behavior on Windows

`fs.symlinkSync(src, dest, 'dir')` in Node.js creates a **directory junction on Windows**, so
**administrator privileges are not required**. You can run it from an ordinary PowerShell.

```powershell
cd C:\path\to\grow-wiki
node integrations\codex\install.mjs
```

## 3. First-time vault initialization

Launch Codex CLI and initialize the vault:

```
$ node ~/.agents/skills/grow-wiki/scripts/init-vault.js
```

Or, in a Codex chat, say "grow-wiki を初期化して" ("initialize grow-wiki") — Codex follows the SKILL.md instructions and runs `init-vault.js` (with prior approval).

## 4. Use it

Codex CLI's SKILL.md triggers come in two forms:

- **Explicit invocation**: `/skills grow-wiki` or `$grow-wiki`
- **Implicit invocation**: utterances matching the SKILL.md `description` automatically activate it
  - Examples: "grow-wiki に保存して", "wiki に追加", "メモっておいて", "あとで読む"

The actual operations are performed by Codex following SKILL.md:

| Example utterance | Action |
|---|---|
| "grow-wiki に保存" | Save the current conversation under `sources/conversations/` |
| "この URL を取り込んで <url>" | Save the URL under `sources/urls/` |
| "grow-wiki に聞いて: <question>" | Answer using the accumulated information |
| "grow-wiki の lint" | Run consistency check |

## Notes

- **A preview is always shown before writing, and saving requires user approval** (no automatic writes)
- To disable implicit invocation, set `allow_implicit_invocation: false` in Codex configuration
- If you move the repository, you need to recreate the symlink (rerun `install.mjs`)

## Uninstall

```bash
# macOS / Linux
unlink ~/.agents/skills/grow-wiki

# Windows (PowerShell)
Remove-Item -Path "$env:USERPROFILE\.agents\skills\grow-wiki"
```

## Troubleshooting

### Codex doesn't detect the skill

- Verify `~/.agents/skills/grow-wiki/SKILL.md` exists: `ls ~/.agents/skills/grow-wiki/SKILL.md`
- Check the symlink isn't broken: `readlink ~/.agents/skills/grow-wiki`
- Restart Codex CLI

### `error: GROW_WIKI_ROOT 環境変数が未設定です`

For PowerShell, after `setx` you must **reopen PowerShell** for the value to take effect.
