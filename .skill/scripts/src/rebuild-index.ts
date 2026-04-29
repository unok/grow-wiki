// rebuild-index.ts — 各フォルダの index.md を自動生成
//
// 使い方:
//   node .skill/scripts/rebuild-index.js              # ルート + 全サブフォルダ
//   node .skill/scripts/rebuild-index.js <folder>     # 特定フォルダのみ
//
// ルート index.md は type 別分類で生成。それ以外のフォルダは folder-index.md テンプレで生成。
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { resolveVaultRoot, ensureVaultExists, relPath } from './lib/vault.js';
import { parseFrontmatter, getStringField } from './lib/frontmatter.js';
import {
  listMarkdownFiles,
  listSubdirectories,
  walkAllDirectories,
  walkAllMarkdownFiles,
} from './lib/walk.js';

const EXCLUDED_STEMS = new Set(['index', 'overview', 'log', 'README']);

// バンドルされた .skill/scripts/<name>.js から見たテンプレディレクトリ
const TEMPLATES_DIR = resolve(__dirname, '../assets/templates');

function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function stemOf(path: string): string {
  return basename(path).replace(/\.md$/, '');
}

function readTemplate(name: string): string {
  const p = join(TEMPLATES_DIR, name);
  if (!existsSync(p)) {
    process.stderr.write(`error: template not found: ${p}\n`);
    process.exit(2);
  }
  return readFileSync(p, 'utf8');
}

function folderPages(folder: string): string[] {
  return listMarkdownFiles(folder)
    .filter((p) => !EXCLUDED_STEMS.has(stemOf(p)))
    .sort();
}

function folderSubfolders(folder: string): string[] {
  return listSubdirectories(folder).sort();
}

function getType(path: string): string {
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return '';
  }
  const { frontmatter } = parseFrontmatter(text);
  return getStringField(frontmatter, 'type') ?? '';
}

function renderFolderIndex(vault: string, folder: string, dateStr: string): void {
  const tpl = readTemplate('folder-index.md');
  const rel = relPath(vault, folder);
  const title = rel === '.' ? 'root' : rel;
  const pages = folderPages(folder);
  const subs = folderSubfolders(folder);

  const pageList =
    pages.length > 0
      ? pages.map((p) => `- [[${stemOf(p)}]]`).join('\n')
      : '- （なし）';
  const subList =
    subs.length > 0
      ? subs.map((s) => `- [${basename(s)}/](${basename(s)}/index.md)`).join('\n')
      : '- （なし）';

  const out = tpl
    .replaceAll('{{date}}', dateStr)
    .replaceAll('{{folder_title}}', title)
    .replaceAll('{{page_list}}', pageList)
    .replaceAll('{{subfolder_list}}', subList);

  const dest = join(folder, 'index.md');
  writeFileSync(dest, out, 'utf8');
  process.stdout.write(`rebuilt: ${relPath(vault, dest)}\n`);
}

function renderRootIndex(vault: string, dateStr: string): void {
  const tpl = readTemplate('root-index.md');
  const allMd = walkAllMarkdownFiles(vault);

  const buckets: Record<string, string[]> = {
    'source-conversation': [],
    'source-url': [],
    entity: [],
    concept: [],
  };

  for (const p of allMd) {
    const stem = stemOf(p);
    if (EXCLUDED_STEMS.has(stem)) continue;
    // ルート直下の log/overview 等は除外（既に EXCLUDED_STEMS で除外されている）
    // さらに vault 直下のファイルは除外（root-index は分類用なのでルート直下は対象外）
    const parent = p.slice(0, p.length - basename(p).length - 1);
    if (parent === vault) continue;
    const t = getType(p);
    if (t in buckets) {
      buckets[t]!.push(stem);
    }
  }

  const fmt = (items: string[]): string => {
    if (items.length === 0) return '- （なし）';
    return items.sort().map((s) => `- [[${s}]]`).join('\n');
  };

  const out = tpl
    .replaceAll('{{date}}', dateStr)
    .replaceAll('{{sources_conversations_list}}', fmt(buckets['source-conversation']!))
    .replaceAll('{{sources_urls_list}}', fmt(buckets['source-url']!))
    .replaceAll('{{entities_list}}', fmt(buckets.entity!))
    .replaceAll('{{concepts_list}}', fmt(buckets.concept!));

  writeFileSync(join(vault, 'index.md'), out, 'utf8');
  process.stdout.write('rebuilt: index.md\n');
}

function main(): void {
  const vault = resolveVaultRoot();
  ensureVaultExists(vault);
  const target = process.argv[2];
  const dateStr = today();

  if (target) {
    const tPath = resolve(vault, target);
    if (!existsSync(tPath) || !statSync(tPath).isDirectory()) {
      process.stderr.write(`error: ${target} is not a directory\n`);
      process.exit(2);
    }
    if (tPath === vault) {
      renderRootIndex(vault, dateStr);
    } else {
      renderFolderIndex(vault, tPath, dateStr);
    }
    return;
  }

  renderRootIndex(vault, dateStr);
  for (const d of walkAllDirectories(vault).sort()) {
    if (d === vault) continue;
    renderFolderIndex(vault, d, dateStr);
  }
}

main();
