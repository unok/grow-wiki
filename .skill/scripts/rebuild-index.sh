#!/usr/bin/env bash
# rebuild-index.sh — 各フォルダの index.md を自動生成
#
# 使い方:
#   bash .skill/scripts/rebuild-index.sh              # 全フォルダ + ルート
#   bash .skill/scripts/rebuild-index.sh <folder>     # 特定フォルダのみ
#
# ルート index.md は type 別分類で生成。それ以外のフォルダは folder-index.md テンプレで生成。
set -euo pipefail
export LC_ALL=C.UTF-8

if [[ -z "${GROW_WIKI_ROOT:-}" ]]; then
  cat >&2 <<'EOF'
error: GROW_WIKI_ROOT 環境変数が未設定です。

以下のいずれかで設定してください:

  方法1. ~/.claude/settings.json の env セクション（推奨）:
    { "env": { "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki" } }

  方法2. シェルで export:
    export GROW_WIKI_ROOT="/absolute/path/to/Obsidian Vault/grow-wiki"
EOF
  exit 2
fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VAULT_ROOT="$GROW_WIKI_ROOT"
TEMPLATES_DIR="$SCRIPT_DIR/../assets/templates"
TARGET="${1:-}"

python3 - "$VAULT_ROOT" "$TEMPLATES_DIR" "$TARGET" <<'PY'
import re
import sys
from datetime import date
from pathlib import Path

vault = Path(sys.argv[1]).resolve()
templates = Path(sys.argv[2]).resolve()
target = sys.argv[3]
today = date.today().isoformat()

EXCLUDED_STEMS = {'index', 'overview', 'log', 'README'}

# 再帰的に全 .md を収集（.skill/ 以外）
all_md = []
for p in sorted(vault.rglob('*.md')):
    if '.skill' in p.parts:
        continue
    all_md.append(p)

def get_type(path: Path) -> str:
    """frontmatter から type を抽出。失敗時は空文字"""
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        return ''
    m = re.search(r'^type:\s*(\S+)\s*$', text, flags=re.MULTILINE)
    return m.group(1) if m else ''

def folder_pages(folder: Path):
    """folder 直下の .md（index.md と隠しファイルを除く）"""
    items = []
    for p in sorted(folder.iterdir()):
        if p.is_file() and p.suffix == '.md' and p.stem not in EXCLUDED_STEMS and not p.name.startswith('.'):
            items.append(p)
    return items

def folder_subfolders(folder: Path):
    subs = []
    for p in sorted(folder.iterdir()):
        if p.is_dir() and not p.name.startswith('.'):
            subs.append(p)
    return subs

def render_folder_index(folder: Path):
    """folder-index.md テンプレで各フォルダ index を再生成"""
    tpl = (templates / 'folder-index.md').read_text(encoding='utf-8')
    rel = folder.relative_to(vault)
    title = str(rel) if str(rel) != '.' else 'root'
    pages = folder_pages(folder)
    subs = folder_subfolders(folder)
    page_list = '\n'.join(f'- [[{p.stem}]]' for p in pages) if pages else '- （なし）'
    sub_list = '\n'.join(f'- [{s.name}/]({s.name}/index.md)' for s in subs) if subs else '- （なし）'
    out = (tpl
           .replace('{{date}}', today)
           .replace('{{folder_title}}', title)
           .replace('{{page_list}}', page_list)
           .replace('{{subfolder_list}}', sub_list))
    (folder / 'index.md').write_text(out, encoding='utf-8')
    print(f"rebuilt: {(folder / 'index.md').relative_to(vault)}")

def render_root_index():
    tpl = (templates / 'root-index.md').read_text(encoding='utf-8')
    buckets = {
        'source-conversation': [],
        'source-url': [],
        'entity': [],
        'concept': [],
    }
    for p in all_md:
        if p.stem in EXCLUDED_STEMS:
            continue
        if p.parent == vault:
            continue  # ルート直下の log/overview 等は除外
        t = get_type(p)
        if t in buckets:
            buckets[t].append(p)

    def fmt(items):
        if not items:
            return '- （なし）'
        return '\n'.join(f'- [[{p.stem}]]' for p in sorted(items, key=lambda x: x.stem))

    # root-index.md は concepts 用の「主要概念」なので、concepts/ 直下を別扱いにはしない
    out = (tpl
           .replace('{{date}}', today)
           .replace('{{sources_conversations_list}}', fmt(buckets['source-conversation']))
           .replace('{{sources_urls_list}}', fmt(buckets['source-url']))
           .replace('{{entities_list}}', fmt(buckets['entity']))
           .replace('{{concepts_list}}', fmt(buckets['concept'])))
    (vault / 'index.md').write_text(out, encoding='utf-8')
    print(f"rebuilt: index.md")

# ターゲット決定
if target:
    t_path = (vault / target).resolve()
    if not t_path.exists() or not t_path.is_dir():
        print(f"error: {target} is not a directory", file=sys.stderr)
        sys.exit(2)
    if t_path == vault:
        render_root_index()
    else:
        render_folder_index(t_path)
else:
    # ルート + 全サブフォルダを再帰的に
    render_root_index()
    for p in sorted(vault.rglob('*')):
        if p.is_dir() and '.skill' not in p.parts and not p.name.startswith('.'):
            render_folder_index(p)

PY
