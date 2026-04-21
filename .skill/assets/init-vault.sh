#!/usr/bin/env bash
# init-vault.sh — grow-wiki の WIKI_ROOT を冪等に初期化
#
# 使い方:
#   bash .skill/assets/init-vault.sh
#
# WIKI_ROOT は .skill/config.sh で定義される絶対パス。
# ディレクトリが未作成でも mkdir -p で作る。既存ファイルは上書きしない（冪等）。
set -euo pipefail
export LC_ALL=C.UTF-8

if [[ -z "${GROW_WIKI_ROOT:-}" ]]; then
  cat >&2 <<'EOF'
error: GROW_WIKI_ROOT 環境変数が未設定です。

grow-wiki は書き込み先 vault を環境変数で受け取ります。以下のいずれかで設定してください:

  方法1. ~/.claude/settings.json の env セクション（推奨、Claude Code 全体で有効）:
    {
      "env": {
        "GROW_WIKI_ROOT": "/absolute/path/to/Obsidian Vault/grow-wiki"
      }
    }

  方法2. シェルで export（手動実行用）:
    export GROW_WIKI_ROOT="/absolute/path/to/Obsidian Vault/grow-wiki"

WIKI_ROOT は Obsidian vault 内の grow-wiki サブフォルダの絶対パスを指定してください。
EOF
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
VAULT_ROOT="$GROW_WIKI_ROOT"

TODAY="$(date +%Y-%m-%d)"

render() {
  local template="$1"
  local title="$2"
  sed \
    -e "s|{{date}}|$TODAY|g" \
    -e "s|{{folder_title}}|$title|g" \
    "$template"
}

ensure_file() {
  local dest="$1"
  local template="$2"
  local title="${3:-}"
  if [[ -f "$dest" ]]; then
    echo "skip  $dest"
    return
  fi
  render "$template" "$title" > "$dest"
  echo "create $dest"
}

# ルートディレクトリ
mkdir -p "$VAULT_ROOT/sources/conversations" \
         "$VAULT_ROOT/sources/urls" \
         "$VAULT_ROOT/entities" \
         "$VAULT_ROOT/concepts"

# ルート固定ファイル
ensure_file "$VAULT_ROOT/index.md"    "$TEMPLATES_DIR/root-index.md"
ensure_file "$VAULT_ROOT/overview.md" "$TEMPLATES_DIR/overview.md"
ensure_file "$VAULT_ROOT/log.md"      "$TEMPLATES_DIR/log.md"

# 各フォルダ index.md（未存在時のみ）
ensure_file "$VAULT_ROOT/sources/index.md"               "$TEMPLATES_DIR/folder-index.md" "sources"
ensure_file "$VAULT_ROOT/sources/conversations/index.md" "$TEMPLATES_DIR/folder-index.md" "sources/conversations"
ensure_file "$VAULT_ROOT/sources/urls/index.md"          "$TEMPLATES_DIR/folder-index.md" "sources/urls"
ensure_file "$VAULT_ROOT/entities/index.md"              "$TEMPLATES_DIR/folder-index.md" "entities"
ensure_file "$VAULT_ROOT/concepts/index.md"              "$TEMPLATES_DIR/folder-index.md" "concepts"

echo "done: $VAULT_ROOT"
