// list-pages.ts — vault 内の全 .md の frontmatter を JSON で列挙
//
// 使い方:
//   node .skill/scripts/list-pages.js              # vault 全体
//   node .skill/scripts/list-pages.js <subpath>    # 特定フォルダ配下のみ
//
// 出力: JSON array (stdout)
//   [{ "path", "basename", "dir", "frontmatter", "mtime", "lines", "bytes" }, ...]
import { readFileSync, statSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { resolveVaultRoot, ensureVaultExists, relPath } from './lib/vault.js';
import { parseFrontmatter, type Frontmatter } from './lib/frontmatter.js';
import { walkAllMarkdownFiles } from './lib/walk.js';

interface PageEntry {
  path: string;
  basename: string;
  dir: string;
  frontmatter: Frontmatter;
  mtime: number;
  lines: number;
  bytes: number;
}

function countLines(text: string): number {
  const newlines = (text.match(/\n/g) ?? []).length;
  return newlines + (text.endsWith('\n') ? 0 : 1);
}

function main(): void {
  const vault = resolveVaultRoot();
  ensureVaultExists(vault);
  const subpath = process.argv[2];
  const root = subpath ? resolve(vault, subpath) : vault;

  const allMd = walkAllMarkdownFiles(root).sort();
  const pages: PageEntry[] = [];
  for (const md of allMd) {
    let text: string;
    try {
      text = readFileSync(md, 'utf8');
    } catch {
      continue;
    }
    const { frontmatter } = parseFrontmatter(text);
    const st = statSync(md);
    const dirRel = relPath(vault, dirname(md));
    pages.push({
      path: relPath(vault, md),
      basename: basename(md).replace(/\.md$/, ''),
      dir: dirRel === '.' ? '' : dirRel,
      frontmatter,
      mtime: Math.floor(st.mtimeMs / 1000),
      lines: countLines(text),
      bytes: st.size,
    });
  }

  process.stdout.write(JSON.stringify(pages, null, 2) + '\n');
}

main();
