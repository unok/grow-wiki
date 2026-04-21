#!/usr/bin/env bash
# health-check.sh — broken wikilink と orphan ページを検出
#
# 使い方:
#   bash .skill/scripts/health-check.sh
#
# 終了コード:
#   0 = 問題なし
#   1 = broken link あり（error）
#
# orphan は warn 扱い（終了コードには影響しない）。
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

python3 - "$VAULT_ROOT" <<'PY'
import re
import sys
from pathlib import Path

vault = Path(sys.argv[1]).resolve()
link_re = re.compile(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]')

# コードブロック（```...```）とインラインコード（`...`）を除いたテキストを返す
def strip_code(text: str) -> str:
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    text = re.sub(r'`[^`\n]*`', '', text)
    return text


EXCLUDED_STEMS = {'index', 'overview', 'log', 'README'}

# content ページ（wikilink の解決先）は EXCLUDED_STEMS を除外
# ただし scan 対象ファイル（リンク抽出元）には index/overview/log も含める
all_files = []
for p in sorted(vault.rglob('*.md')):
    if '.skill' in p.parts:
        continue
    all_files.append(p)
content_files = {p.stem: p for p in all_files if p.stem not in EXCLUDED_STEMS}

broken = []
refs = {k: 0 for k in content_files}
for path in all_files:
    text = path.read_text(encoding='utf-8')
    for m in link_re.finditer(strip_code(text)):
        target = m.group(1).strip()
        if target in EXCLUDED_STEMS:
            continue
        if target not in content_files:
            broken.append((str(path.relative_to(vault)), target))
            continue
        if target == path.stem:
            continue  # self-ref
        refs[target] += 1

print(f"=== grow-wiki health check ===")
print(f"vault: {vault}")
print(f"content pages: {len(content_files)}")
print(f"total .md files: {len(all_files)}")
if broken:
    print(f"\n❌ broken wikilinks: {len(broken)}")
    for src, tgt in broken:
        print(f"  {src} -> [[{tgt}]]")
else:
    print("\n✅ broken wikilinks: 0")

orphans = [stem for stem, n in refs.items() if n == 0]
if orphans:
    print(f"\n⚠️  orphan pages: {len(orphans)} (warn)")
    for o in orphans:
        print(f"  {content_files[o].relative_to(vault)}")
else:
    print("\n✅ orphan pages: 0")

sys.exit(1 if broken else 0)
PY
