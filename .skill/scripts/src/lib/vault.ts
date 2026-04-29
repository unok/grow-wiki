// vault.ts — GROW_WIKI_ROOT 環境変数の解決と vault パスのユーティリティ
import { existsSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ENV_VAR = 'GROW_WIKI_ROOT';

const SETUP_GUIDE = `error: ${ENV_VAR} 環境変数が未設定です。

grow-wiki は書き込み先 vault を環境変数で受け取ります。以下のいずれかで設定してください:

  方法1. Claude Code (~/.claude/settings.json) の env セクション:
    { "env": { "${ENV_VAR}": "/absolute/path/to/Obsidian Vault/grow-wiki" } }

  方法2. Gemini CLI (~/.gemini/settings.json) の env セクション:
    { "env": { "${ENV_VAR}": "/absolute/path/to/Obsidian Vault/grow-wiki" } }

  方法3. シェルで export (macOS / Linux):
    export ${ENV_VAR}="/absolute/path/to/Obsidian Vault/grow-wiki"

  方法4. PowerShell (Windows) で永続化:
    [Environment]::SetEnvironmentVariable("${ENV_VAR}", "C:\\path\\to\\Obsidian Vault\\grow-wiki", "User")
    （設定後は PowerShell を開き直してください）

  方法5. cmd (Windows) で永続化:
    setx ${ENV_VAR} "C:\\path\\to\\Obsidian Vault\\grow-wiki"
`;

export function resolveVaultRoot(): string {
  const value = process.env[ENV_VAR];
  if (!value || value.trim() === '') {
    process.stderr.write(SETUP_GUIDE);
    process.exit(2);
  }
  return resolve(value.trim());
}

export function ensureVaultExists(root: string): void {
  if (!existsSync(root)) {
    process.stderr.write(`error: vault ディレクトリが存在しません: ${root}\n`);
    process.stderr.write(`先に init-vault を実行してください: node .skill/scripts/init-vault.js\n`);
    process.exit(2);
  }
}

// vault からの相対パスを常に forward-slash で返す（Windows 互換）。
// 同一パスは '.' を返す。
export function relPath(from: string, to: string): string {
  if (from === to) return '.';
  return relative(from, to).split(sep).join('/');
}
