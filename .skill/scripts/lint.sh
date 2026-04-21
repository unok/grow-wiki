#!/usr/bin/env bash
# lint.sh — grow-wiki vault の整合性チェック (L1-L4)
#
# 使い方:
#   bash .skill/scripts/lint.sh              # 全チェック
#   bash .skill/scripts/lint.sh --check      # read-only（副作用なし。現状 lint.sh 自体が副作用なしなので同義）
#   bash .skill/scripts/lint.sh --quiet      # error のみ出力
#
# 終了コード: 0=ok, 1=warn, 2=error
#
# 閾値は references/lint-rules.md と同期すること。
set -uo pipefail
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
QUIET=0
for arg in "$@"; do
  case "$arg" in
    --check) ;;                # read-only: 既定動作
    --quiet) QUIET=1 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

python3 - "$VAULT_ROOT" "$QUIET" <<'PY'
import re
import sys
from datetime import date, datetime
from pathlib import Path

vault = Path(sys.argv[1]).resolve()
quiet = sys.argv[2] == '1'

# === 閾値（lint-rules.md と同期） ===
L1_WARN = 20
L1_ERROR = 40
L2_WARN_LINES = 300
L2_WARN_CHARS = 8000
L2_ERROR_LINES = 500
L2_ERROR_CHARS = 15000
# ==================================

EXCLUDED_STEMS = {'index', 'overview', 'log', 'README'}
link_re = re.compile(r'\[\[([^\]|]+)(?:\|[^\]]+)?\]\]')


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


def strip_code(text: str) -> str:
    text = re.sub(r'```.*?```', '', text, flags=re.DOTALL)
    text = re.sub(r'`[^`\n]*`', '', text)
    return text


# 全ファイル収集
all_md = []
for p in sorted(vault.rglob('*.md')):
    if '.skill' in p.parts:
        continue
    all_md.append(p)

# ディレクトリ一覧（vault + 全サブディレクトリ）
all_dirs = [vault]
for p in sorted(vault.rglob('*')):
    if p.is_dir() and '.skill' not in p.parts and not p.name.startswith('.'):
        all_dirs.append(p)


warnings = []
errors = []


def add_warn(rule: str, msg: str):
    warnings.append((rule, msg))


def add_error(rule: str, msg: str):
    errors.append((rule, msg))


# === L1: folder-size ===
for d in all_dirs:
    pages = [p for p in d.iterdir()
             if p.is_file() and p.suffix == '.md'
             and p.stem not in EXCLUDED_STEMS
             and not p.name.startswith('.')]
    n = len(pages)
    rel = str(d.relative_to(vault)) if d != vault else '.'
    if n > L1_ERROR:
        add_error('L1', f"{rel}/: {n} files (error, threshold {L1_ERROR})")
    elif n > L1_WARN:
        add_warn('L1', f"{rel}/: {n} files (warn, threshold {L1_WARN})")

# === L2: file-length ===
page_meta = {}  # path -> (text, fm, lines, chars)
for md in all_md:
    text = md.read_text(encoding='utf-8')
    fm = parse_frontmatter(text)
    lines = text.count('\n') + (0 if text.endswith('\n') else 1)
    chars = len(text)
    page_meta[md] = (text, fm, lines, chars)
    rel = str(md.relative_to(vault))
    if lines > L2_ERROR_LINES or chars > L2_ERROR_CHARS:
        add_error('L2', f"{rel}: {lines} lines / {chars} chars "
                        f"(error, threshold {L2_ERROR_LINES} lines / {L2_ERROR_CHARS} chars)")
    elif lines > L2_WARN_LINES or chars > L2_WARN_CHARS:
        add_warn('L2', f"{rel}: {lines} lines / {chars} chars "
                       f"(warn, threshold {L2_WARN_LINES} lines / {L2_WARN_CHARS} chars)")

# === L3: index-completeness ===
for d in all_dirs:
    idx = d / 'index.md'
    if not idx.exists():
        continue
    pages = [p for p in d.iterdir()
             if p.is_file() and p.suffix == '.md'
             and p.stem not in EXCLUDED_STEMS
             and not p.name.startswith('.')]
    actual = {p.stem for p in pages}
    text, fm, _, _ = page_meta[idx]
    linked = set()
    for m in link_re.finditer(strip_code(text)):
        t = m.group(1).strip()
        # サブフォルダリンク（folder-index.md はサブフォルダ表示でリンクを書かないがテンプレ上は書いてもよい）を除外
        linked.add(t)
    missing = actual - linked
    extra = {l for l in linked if l not in actual and l not in EXCLUDED_STEMS}
    # extra は他フォルダのページ名を参照している場合もあるので、vault 全体で存在しない場合のみ error
    all_stems = {p.stem for p in all_md if p.stem not in EXCLUDED_STEMS}
    extra = extra - all_stems  # 他フォルダに存在するページ名はスルー
    if missing:
        add_error('L3', f"{idx.relative_to(vault)}: missing links -> "
                        + ', '.join(f'[[{m}]]' for m in sorted(missing)))
    if extra:
        add_error('L3', f"{idx.relative_to(vault)}: extra links -> "
                        + ', '.join(f'[[{e}]]' for e in sorted(extra)))

# === L4: index-freshness & link-text validity ===
# 各 content ページの title / aliases を収集
content_title_map = {}  # stem -> (title, aliases)
for md in all_md:
    if md.stem in EXCLUDED_STEMS:
        continue
    _, fm, _, _ = page_meta[md]
    title = fm.get('title', md.stem) if isinstance(fm.get('title'), str) else md.stem
    aliases = fm.get('aliases', []) if isinstance(fm.get('aliases'), list) else []
    content_title_map[md.stem] = (title, aliases)

for d in all_dirs:
    idx = d / 'index.md'
    if not idx.exists():
        continue
    text, fm, _, _ = page_meta[idx]
    idx_last = fm.get('last_updated') if isinstance(fm.get('last_updated'), str) else ''
    try:
        idx_date = datetime.strptime(idx_last, '%Y-%m-%d').date() if idx_last else None
    except ValueError:
        idx_date = None

    # 鮮度: 同フォルダ直下のページの last_updated または mtime と比較
    if idx_date:
        newer = []
        for p in d.iterdir():
            if not (p.is_file() and p.suffix == '.md' and p.stem not in EXCLUDED_STEMS):
                continue
            _, pfm, _, _ = page_meta[p]
            p_last = pfm.get('last_updated') if isinstance(pfm.get('last_updated'), str) else ''
            try:
                p_date = datetime.strptime(p_last, '%Y-%m-%d').date() if p_last else None
            except ValueError:
                p_date = None
            if p_date and p_date > idx_date:
                newer.append(p.stem)
        if newer:
            add_warn('L4', f"{idx.relative_to(vault)}: last_updated={idx_last}, "
                           f"{len(newer)} newer pages ({', '.join(newer[:5])}{'...' if len(newer) > 5 else ''})")

    # リンクテキスト妥当性: [[X]] の X が対応ファイルの title/aliases にあるか
    for m in link_re.finditer(strip_code(text)):
        t = m.group(1).strip()
        if t in EXCLUDED_STEMS:
            continue
        # t は basename としてファイルが存在する想定（L3 で検証済）
        if t not in content_title_map:
            continue  # L3 で検出されているのでスキップ
        title, aliases = content_title_map[t]
        # リンクテキストは basename と title が自然に一致することを期待
        # stem が title と異なる場合で、かつ stem でも aliases でもない場合は不一致
        if t != title and t not in aliases:
            add_error('L4', f"{idx.relative_to(vault)}: [[{t}]] "
                            f"does not match title=\"{title}\" or any alias")


# === 出力 ===
if not quiet:
    print(f"=== grow-wiki lint ===")
    print(f"vault: {vault}")
    print(f"pages scanned: {len(all_md)}")
    print()

if warnings and not quiet:
    print(f"⚠️  warnings: {len(warnings)}")
    for rule, msg in warnings:
        print(f"  [{rule}] {msg}")
    print()

if errors:
    print(f"❌ errors: {len(errors)}")
    for rule, msg in errors:
        print(f"  [{rule}] {msg}")
    print()

if not warnings and not errors and not quiet:
    print("✅ no issues")

if errors:
    sys.exit(2)
if warnings:
    sys.exit(1)
sys.exit(0)
PY
