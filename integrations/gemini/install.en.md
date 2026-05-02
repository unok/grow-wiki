# Gemini CLI integration setup

**English** | [日本語](install.md)

Steps to use `grow-wiki` from Gemini CLI. Works on Windows / macOS / Linux.

## Prerequisites

- Node.js 20 or later (already bundled if Gemini CLI is installed)
- Gemini CLI (`@google/gemini-cli`)
- This repository cloned locally

## 1. Set the `GROW_WIKI_ROOT` environment variable

The **absolute path** of the folder inside your Obsidian vault where the wiki is stored.

### Windows (PowerShell, persistent)

```powershell
[Environment]::SetEnvironmentVariable("GROW_WIKI_ROOT", "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki", "User")
```

After setting, **reopen PowerShell**.

### Windows (cmd, persistent)

```cmd
setx GROW_WIKI_ROOT "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki"
```

### macOS / Linux

Add to `~/.bashrc` or `~/.zshrc`:

```bash
export GROW_WIKI_ROOT="/absolute/path/to/Obsidian Vault/grow-wiki"
```

Or use the `env` section of Gemini CLI's settings file `~/.gemini/settings.json` (effective for the whole CLI):

```json
{
  "env": {
    "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki"
  }
}
```

## 2. Install slash commands

From the root directory of this repository:

```bash
node integrations/gemini/install.mjs
```

This generates the following 5 command files under `~/.gemini/commands/`:

- `wiki-init.toml` — initialize the vault
- `wiki-save.toml` — save the conversation
- `wiki-url.toml` — ingest a URL
- `wiki-ask.toml` — answer using accumulated information
- `wiki-lint.toml` — consistency check

To install elsewhere, pass an argument:

```bash
node integrations/gemini/install.mjs /path/to/custom/commands/dir
```

### Windows execution example

```powershell
cd C:\path\to\grow-wiki
node integrations\gemini\install.mjs
```

## 3. First-time vault initialization

Launch Gemini CLI and run `/wiki-init`:

```
> /wiki-init
```

This creates the directory structure and templates under `$GROW_WIKI_ROOT` (existing files are not overwritten — idempotent).

## 4. Use it

| Command | Purpose |
|---|---|
| `/wiki-save` | Save the current conversation under `sources/conversations/` |
| `/wiki-save <topic>` | Specify a focus topic via argument |
| `/wiki-url <url>` | Ingest the URL and save under `sources/urls/` |
| `/wiki-ask <question>` | Answer using accumulated information |
| `/wiki-lint` | Run consistency check |

## Notes

- **A preview is always shown before writing, and saving requires user approval** (no automatic writes)
- The keyword auto-detection from Claude Code's SKILL.md (e.g. "メモっておいて") does NOT work on Gemini CLI. **Always invoke explicitly with the `/wiki-` prefix**
- If you move the repository, rerun `node integrations/gemini/install.mjs` to update the paths (the absolute path is embedded in the TOML)
- After updating `references/*.md`, rerun `install.mjs` to reflect the changes in the TOML

## Troubleshooting

### `error: GROW_WIKI_ROOT 環境変数が未設定です` appears

For PowerShell, after `setx` you must **reopen PowerShell** for the value to take effect.
Verify with `echo $env:GROW_WIKI_ROOT`.

### Gemini CLI asks "Approve shell execution?" when running `/wiki-save`

This is expected. It's not the `!{...}` syntax — the AI model executes `node ...js` via its shell tool and approval is required each time.
Approve "yes" if you trust the action, or review the command before approving.
