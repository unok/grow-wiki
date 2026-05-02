# grow-wiki

**English** | [日本語](README.md)

A skill for continuously accumulating conversations, URLs, and notes as an Obsidian-compatible markdown wiki. Works with **Claude Code / Gemini CLI / Codex CLI**.

Inspired by [SamurAIGPT/llm-wiki-agent](https://github.com/SamurAIGPT/llm-wiki-agent), it writes to a subfolder inside an Obsidian vault. Information extracted from conversations is organized in a 3-layer structure (sources / entities / concepts), with cross-references via `[[wikilink]]`, 7 consistency lint rules, and assisted folder rebalancing.

## Features

- **Conversation → wiki**: Summarize and structure conversations as markdown
- **URL → wiki**: Fetch articles via WebFetch, summarize, and structure them
- **Existing page updates**: Append to or regenerate existing pages by title/alias match
- **Automatic `[[wikilink]]` insertion**: Detects matches against existing page names
- **7 lint rules**: folder size / file length / index.md completeness / index.md freshness & link validity / subfolder-exclusivity / citation-required / misc-flat
- **Folder auto-split**: Reorganize into topical subfolders when thresholds are exceeded (with approval)
- **User approval required**: No write happens without user approval, even after a trigger fires
- **Multi-CLI support**: The same scripts and the same procedure docs (references) are shared across 3 CLIs

## CLI support matrix

| CLI | Skill format | Auto trigger | Explicit invocation | Setup |
|---|---|---|---|---|
| Claude Code | `~/.claude/skills/grow-wiki/SKILL.md` | Yes — keyword detection via frontmatter | Guided by utterances | symlink |
| Codex CLI | `~/.agents/skills/grow-wiki/SKILL.md` | Yes — implicit invocation by description match | `/skills grow-wiki` / `$grow-wiki` | symlink |
| Gemini CLI | `~/.gemini/commands/wiki-*.toml` | No (explicit commands only) | `/wiki-save` / `/wiki-url` / `/wiki-ask` / `/wiki-lint` / `/wiki-init` | TOML generation |

The scripts (`lint.js` / `list-pages.js` / `rebuild-index.js` / `health-check.js` / `init-vault.js`) and
the procedure docs (`.skill/references/*.md`) are **shared across all CLIs**.

## Prerequisites

- **Node.js 20+** (already bundled when you install Gemini CLI / Codex CLI; verify with `node --version`)
- One of the supported CLIs (Claude Code / Codex CLI / Gemini CLI)
- Obsidian (optional, for browsing)

Python and Bash are **no longer required** (since v0.1, TypeScript / Node.js based).

## Common setup

### 1. Clone the repository

```bash
git clone https://github.com/<your-github-user>/grow-wiki.git
cd grow-wiki
```

### 2. Set the `GROW_WIKI_ROOT` environment variable

Specify the **absolute path** of the write target (a subfolder inside your Obsidian vault). When unset, every script halts and prints setup instructions (no default value).

#### Windows (PowerShell, persistent)

```powershell
[Environment]::SetEnvironmentVariable("GROW_WIKI_ROOT", "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki", "User")
```

After setting, **reopen PowerShell**.

#### Windows (cmd)

```cmd
setx GROW_WIKI_ROOT "C:\Users\<your>\Documents\Obsidian Vault\grow-wiki"
```

#### macOS / Linux (shell)

```bash
export GROW_WIKI_ROOT="/absolute/path/to/YourObsidianVault/grow-wiki"
```

Add to `~/.bashrc` / `~/.zshrc` etc. for persistence.

#### Via each CLI's settings file (recommended)

| CLI | Settings file |
|---|---|
| Claude Code | `env` section of `~/.claude/settings.json` |
| Gemini CLI | `env` section of `~/.gemini/settings.json` |
| Codex CLI | Use OS environment variables |

Example (JSON format, common to Claude Code / Gemini CLI):

```json
{
  "env": {
    "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki"
  }
}
```

### 3. Skill registration (per CLI)

See the corresponding section below for each CLI.

## Per-CLI setup

### Claude Code

Cross-platform (Windows / macOS / Linux) installer:

```bash
node integrations/claude/install.mjs
```

This creates a symlink (a directory junction on Windows) `~/.claude/skills/grow-wiki -> <repo>/.skill`.
To install at project scope, pass the destination as an argument:

```bash
node integrations/claude/install.mjs /path/to/your-project/.claude/skills
```

Manual symlink alternative (macOS / Linux):

```bash
ln -s "$(pwd)/.skill" ~/.claude/skills/grow-wiki
```

### Codex CLI

```bash
node integrations/codex/install.mjs
```

Details: [integrations/codex/install.en.md](integrations/codex/install.en.md) ([日本語](integrations/codex/install.md)).

### Gemini CLI

```bash
node integrations/gemini/install.mjs
```

Details: [integrations/gemini/install.en.md](integrations/gemini/install.en.md) ([日本語](integrations/gemini/install.md)).

### 4. Initialize the vault

```bash
node ~/.claude/skills/grow-wiki/scripts/init-vault.js
```

(For Codex CLI, use `~/.agents/skills/grow-wiki/scripts/init-vault.js`, or call `node <repo>/.skill/scripts/init-vault.js` directly.)

The following structure is created at `$GROW_WIKI_ROOT` (existing files are not overwritten — idempotent):

```
<GROW_WIKI_ROOT>/
├── index.md              # Root index (auto-generated)
├── overview.md           # Cross-cutting summary
├── log.md                # Update history (append-only)
├── sources/
│   ├── conversations/
│   └── urls/
├── entities/
└── concepts/
```

### 5. Obsidian configuration (optional)

Open the parent directory of `$GROW_WIKI_ROOT` (the vault root) in Obsidian. The `grow-wiki/` subfolder appears inside the existing vault, and `[[wikilink]]` is recognized as-is.

## Usage

### Claude Code / Codex CLI (auto-trigger supported)

Just speak in conversation — the AI follows the instructions in SKILL.md.

#### Writing

- "grow-wiki に保存" / "wiki に追加" — save the current conversation as a wiki page
- "この URL を取り込んで" — generate a wiki page from a URL
- "〇〇ページを更新" — append to or regenerate an existing page

#### Querying (Q&A)

- "grow-wiki に聞いて" / "wiki を見て答えて" — answer using accumulated knowledge
- "以前の〇〇の話" / "前に書いた〇〇" — find related pages by keyword and cite them

#### Keyword-based suggestions

When the following keywords appear in conversation, the assistant suggests "grow-wiki に保存しましょうか？".

- "メモっておいて" / "メモしとく"
- "覚えておいて" / "記憶しておいて"
- "あとで読む"
- "ブックマーク" / "保存しとく"

#### Maintenance

- "grow-wiki で lint" — run consistency check
- "grow-wiki の index を再生成" — regenerate every folder's index.md
- "grow-wiki の health check" — verify broken links / orphans

### Gemini CLI (explicit commands)

Gemini CLI does not support auto-triggers, so always invoke explicitly with the `/wiki-` prefix.

| Command | Action |
|---|---|
| `/wiki-init` | Initialize the vault |
| `/wiki-save` | Save the current conversation |
| `/wiki-save <topic>` | Specify a focus topic via argument |
| `/wiki-url <url>` | Ingest a URL |
| `/wiki-ask <question>` | Answer using accumulated knowledge |
| `/wiki-lint` | Run consistency check |

**Writes always require user approval.** Before any ingest, a preview is shown and files are created/updated only after you approve.

## Manual maintenance (CLI-independent)

```bash
# Initialize vault (idempotent)
node <repo>/.skill/scripts/init-vault.js

# Regenerate all index.md
node <repo>/.skill/scripts/rebuild-index.js

# Link integrity check (broken / orphan)
node <repo>/.skill/scripts/health-check.js

# Lint (7 rules: L1–L7)
node <repo>/.skill/scripts/lint.js

# List frontmatter of all pages as JSON
node <repo>/.skill/scripts/list-pages.js
```

`<repo>` is the clone path, or via the symlink at `~/.claude/skills/grow-wiki` / `~/.agents/skills/grow-wiki`.

## Lint rules

| # | Check | warn threshold | error threshold |
|---|---|---|---|
| L1 | Items per folder (files + subfolders) | 20 | 40 |
| L2 | File length | 300 lines / 8000 chars | 500 lines / 15000 chars |
| L3 | index.md completeness | — | missing or extra entries |
| L4 | index.md freshness & link validity | stale | link text mismatch |
| L5 | subfolder-exclusivity (no pages directly under a folder that has subfolders) | — | pages found at top level |
| L6 | citation-required (entity/concept needs a source; source-url needs `source_url`) | no source | — |
| L7 | misc-flat (no subfolders inside misc/etc/others) | — | subfolders present |

### Why these checks

- **L1 folder-size** — A folder with too many items makes target pages hard to find. Subfolders alone don't reduce the count of "visible items," so we restrict by **files + subfolders combined**. When over the threshold, split topically per [folder-rebalance](.skill/references/folder-rebalance.md)
- **L2 file-length** — Wiki articles are more reusable when short. Length usually means multiple topics are mixed in, or that a section should be carved into a separate page. At the error level, split the section out as an entity / concept
- **L3 index-completeness** — Each folder's `index.md` is auto-generated under the contract that "it lists every page directly under the folder." Missing entries (a page not listed) or extras (links to deleted pages) are integrity violations and are a common source of broken links and lost pages
- **L4 index-freshness** — When a page newer than the index's `last_updated` exists, or when an index link's text disagrees with the current `title` / `aliases`, new information is undiscoverable even though it's in the vault. Detects regen omissions after title changes
- **L5 subfolder-exclusivity** — Leaving pages at the top level of a folder that already has subfolders forces the reader to look in **both** places, halving findability. After rebalance, **move everything into subfolders** (otherwise into misc)
- **L6 citation-required** — Information without a source is unreliable as a wiki and impossible to verify later. Conversations cite via `[[source page]]`; books cite a sales URL (Amazon / publisher official, etc.); articles cite a public URL. Having a link also leaves room for a future health-check to verify validity
- **L7 misc-flat** — `misc` / `etc` / `others` is the catch-all for "couldn't classify." Adding hierarchy inside it creates "miscellaneous within miscellaneous" and erases its purpose. When it grows, **don't sub-classify inside misc — create a new category at the parent level** and lift those pages out

To change thresholds, update both `.skill/references/lint-rules.md` and `.skill/scripts/src/lint.ts` to the same value, then run `pnpm build` to rebuild.

## Operating principles

- **No automatic writes**: User approval is required even after a trigger fires
- **`[[wikilink]]` form only**: Don't use relative or absolute paths (so Obsidian's automatic link rewriting works)
- **index.md is auto-generated**: Don't edit by hand. Update via `node .skill/scripts/rebuild-index.js`
- **log.md is append-only**: Never rewrite past entries

For details, see [.skill/SKILL.md](.skill/SKILL.md) and [.skill/references/](.skill/references/) (Japanese).

## Development (TypeScript build)

Scripts are written in TypeScript and bundled to `.js` with esbuild (js-yaml is bundled in).
The artifacts (`.skill/scripts/*.js`) are committed to the repo, so end users do not need `npm install`.
Only when editing:

```bash
pnpm install        # devDeps (typescript, esbuild, js-yaml, @types/node)
pnpm build          # .skill/scripts/src/*.ts → .skill/scripts/*.js
pnpm typecheck      # tsc --noEmit
```

After building, commit the `.js` files and push.

## Directory layout

```
grow-wiki/                      ← this repository (clone target)
├── .skill/                     ← skill body (used via symlink for Claude Code / Codex CLI)
│   ├── SKILL.md                ← entry point (auto-trigger via frontmatter)
│   ├── references/             ← design docs (procedure docs shared by all CLIs)
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
│   ├── scripts/                ← Node.js artifacts (built from TypeScript)
│   │   ├── src/                ← TypeScript sources (edit here)
│   │   ├── package.json        ← {"type": "commonjs"} (runtime isolation)
│   │   ├── lint.js             ← run via `node .skill/scripts/lint.js`
│   │   ├── list-pages.js
│   │   ├── health-check.js
│   │   ├── rebuild-index.js
│   │   └── init-vault.js
│   └── assets/
│       └── templates/          ← 8 page templates
├── integrations/
│   ├── claude/                 ← Claude Code integration
│   │   └── install.mjs         ← create ~/.claude/skills/grow-wiki symlink
│   ├── codex/                  ← Codex CLI integration
│   │   ├── install.mjs         ← create ~/.agents/skills/grow-wiki symlink
│   │   └── install.md
│   └── gemini/                 ← Gemini CLI integration
│       ├── install.mjs         ← generate ~/.gemini/commands/wiki-*.toml
│       ├── install.md
│       └── templates/          ← TOML templates (with placeholder expansion)
├── package.json                ← devDeps: typescript, esbuild, js-yaml, @types/node
├── tsconfig.json
├── scripts/
│   └── build.mjs               ← esbuild build script (pnpm build)
├── README.md                   ← Japanese (primary)
├── README.en.md                ← English
└── LICENSE

<GROW_WIKI_ROOT>/               ← wiki content target (inside a separate Obsidian vault)
├── index.md / overview.md / log.md
├── sources/{conversations,urls}/
├── entities/
└── concepts/
```

The repository itself contains no wiki content. The wiki accumulates separately at `$GROW_WIKI_ROOT`.

## License

MIT. See [LICENSE](LICENSE).

## Note on documentation languages

The primary docs (`README.md`, `.skill/SKILL.md`, `.skill/references/*.md`, `integrations/*/install.md`) are written in Japanese, since that is the working language of the maintainer and the tool is designed primarily for Japanese-speaking users. This README and the per-CLI `install.en.md` files are the English entry points. Pull requests with English translations of the reference docs (`.skill/references/*.md`) are welcome.
