// init-vault.ts — grow-wiki vault を冪等に初期化
//
// 使い方:
//   node .skill/scripts/init-vault.js
//
// GROW_WIKI_ROOT 環境変数が指す絶対パスにディレクトリ構造とファイルを作成する。
// 既存ファイルは上書きしない（冪等）。
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { resolveVaultRoot } from './lib/vault.js';

// バンドルされた .skill/scripts/init-vault.js から見たテンプレディレクトリ
const TEMPLATES_DIR = resolve(__dirname, '../assets/templates');

function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function render(template: string, title: string, dateStr: string): string {
  const p = join(TEMPLATES_DIR, template);
  if (!existsSync(p)) {
    process.stderr.write(`error: template not found: ${p}\n`);
    process.exit(2);
  }
  let text = readFileSync(p, 'utf8');
  text = text.replaceAll('{{date}}', dateStr);
  text = text.replaceAll('{{folder_title}}', title);
  return text;
}

function ensureFile(dest: string, template: string, title: string, dateStr: string): void {
  if (existsSync(dest)) {
    process.stdout.write(`skip  ${dest}\n`);
    return;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, render(template, title, dateStr), 'utf8');
  process.stdout.write(`create ${dest}\n`);
}

function main(): void {
  const vault = resolveVaultRoot();
  const dateStr = today();

  // ディレクトリ作成
  mkdirSync(join(vault, 'sources/conversations'), { recursive: true });
  mkdirSync(join(vault, 'sources/urls'), { recursive: true });
  mkdirSync(join(vault, 'entities'), { recursive: true });
  mkdirSync(join(vault, 'concepts'), { recursive: true });

  // ルート固定ファイル
  ensureFile(join(vault, 'index.md'), 'root-index.md', '', dateStr);
  ensureFile(join(vault, 'overview.md'), 'overview.md', '', dateStr);
  ensureFile(join(vault, 'log.md'), 'log.md', '', dateStr);

  // 各フォルダ index.md（未存在時のみ）
  ensureFile(join(vault, 'sources/index.md'), 'folder-index.md', 'sources', dateStr);
  ensureFile(
    join(vault, 'sources/conversations/index.md'),
    'folder-index.md',
    'sources/conversations',
    dateStr,
  );
  ensureFile(join(vault, 'sources/urls/index.md'), 'folder-index.md', 'sources/urls', dateStr);
  ensureFile(join(vault, 'entities/index.md'), 'folder-index.md', 'entities', dateStr);
  ensureFile(join(vault, 'concepts/index.md'), 'folder-index.md', 'concepts', dateStr);

  process.stdout.write(`done: ${vault}\n`);
}

main();
