#!/usr/bin/env bash
# list-pages.sh — vault 内の全 .md の frontmatter を JSON で列挙
#
# 使い方:
#   bash .skill/scripts/list-pages.sh              # vault 全体
#   bash .skill/scripts/list-pages.sh <subpath>    # 特定フォルダ配下のみ
#
# 出力: JSON array (stdout)
#   [{ "path", "basename", "dir", "frontmatter", "mtime", "lines", "bytes" }, ...]
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
SUBPATH="${1:-}"

python3 - "$VAULT_ROOT" "$SUBPATH" <<'PY'
import json
import re
import sys
from pathlib import Path


def parse_frontmatter(text: str) -> dict:
    if not text.startswith('---\n'):
        return {}
    end = text.find('\n---', 4)
    if end < 0:
        return {}
    block = text[4:end]
    result: dict = {}
    cur_key = None
    for line in block.split('\n'):
        if not line.strip():
            continue
        m_item = re.match(r'^\s+-\s+(.*)$', line)
        if m_item and cur_key is not None:
            item = m_item.group(1).strip()
            if item.startswith('"') and item.endswith('"'):
                item = item[1:-1]
            result.setdefault(cur_key, []).append(item)
            continue
        m_kv = re.match(r'^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$', line)
        if not m_kv:
            continue
        key, val = m_kv.group(1), m_kv.group(2).rstrip()
        if val == '':
            cur_key = key
            result[key] = []
        elif val.startswith('[') and val.endswith(']'):
            inner = val[1:-1].strip()
            if inner == '':
                result[key] = []
            else:
                items = []
                for s in re.split(r',\s*', inner):
                    s = s.strip()
                    if s.startswith('"') and s.endswith('"'):
                        s = s[1:-1]
                    items.append(s)
                result[key] = items
            cur_key = None
        else:
            v = val.strip()
            if v.startswith('"') and v.endswith('"'):
                v = v[1:-1]
            result[key] = v
            cur_key = None
    return result


vault = Path(sys.argv[1]).resolve()
subpath = sys.argv[2] if len(sys.argv) > 2 else ''
root = vault / subpath if subpath else vault
pages = []
for md in sorted(root.rglob('*.md')):
    if '.skill' in md.parts:
        continue
    try:
        text = md.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        continue
    fm = parse_frontmatter(text)
    st = md.stat()
    rel_parent = md.parent.relative_to(vault)
    pages.append({
        'path': str(md.relative_to(vault)),
        'basename': md.stem,
        'dir': str(rel_parent) if str(rel_parent) != '.' else '',
        'frontmatter': fm,
        'mtime': int(st.st_mtime),
        'lines': text.count('\n') + (0 if text.endswith('\n') else 1),
        'bytes': st.st_size,
    })
print(json.dumps(pages, ensure_ascii=False, indent=2))
PY
