// health-check.ts — broken wikilink と orphan ページを検出
//
// 使い方:
//   node .skill/scripts/health-check.js
//
// 終了コード:
//   0 = 問題なし
//   1 = broken link あり（error）
//
// orphan は warn 扱い（終了コードには影響しない）。
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { resolveVaultRoot, ensureVaultExists, relPath } from './lib/vault.js';
import { extractWikilinks } from './lib/wikilink.js';
import { walkAllMarkdownFiles } from './lib/walk.js';

const EXCLUDED_STEMS = new Set(['index', 'overview', 'log', 'README']);

function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function stemOf(path: string): string {
  return basename(path).replace(/\.md$/, '');
}

function main(): void {
  const vault = resolveVaultRoot();
  ensureVaultExists(vault);

  const allFiles = walkAllMarkdownFiles(vault).sort();
  const contentFiles = new Map<string, string>(); // stem -> path
  for (const p of allFiles) {
    const stem = stemOf(p);
    if (!EXCLUDED_STEMS.has(stem)) {
      contentFiles.set(stem, p);
    }
  }

  const broken: { src: string; target: string }[] = [];
  const refs = new Map<string, number>();
  for (const stem of contentFiles.keys()) {
    refs.set(stem, 0);
  }

  for (const path of allFiles) {
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    for (const link of extractWikilinks(stripCode(text))) {
      const target = link.target;
      if (EXCLUDED_STEMS.has(target)) continue;
      if (!contentFiles.has(target)) {
        broken.push({ src: relPath(vault, path), target });
        continue;
      }
      if (target === stemOf(path)) continue; // self-ref
      refs.set(target, (refs.get(target) ?? 0) + 1);
    }
  }

  process.stdout.write('=== grow-wiki health check ===\n');
  process.stdout.write(`vault: ${vault}\n`);
  process.stdout.write(`content pages: ${contentFiles.size}\n`);
  process.stdout.write(`total .md files: ${allFiles.length}\n`);

  if (broken.length > 0) {
    process.stdout.write(`\n❌ broken wikilinks: ${broken.length}\n`);
    for (const { src, target } of broken) {
      process.stdout.write(`  ${src} -> [[${target}]]\n`);
    }
  } else {
    process.stdout.write('\n✅ broken wikilinks: 0\n');
  }

  const orphans: string[] = [];
  for (const [stem, n] of refs.entries()) {
    if (n === 0) orphans.push(stem);
  }
  if (orphans.length > 0) {
    orphans.sort();
    process.stdout.write(`\n⚠️  orphan pages: ${orphans.length} (warn)\n`);
    for (const o of orphans) {
      const p = contentFiles.get(o);
      if (p) {
        process.stdout.write(`  ${relPath(vault, p)}\n`);
      }
    }
  } else {
    process.stdout.write('\n✅ orphan pages: 0\n');
  }

  process.exit(broken.length > 0 ? 1 : 0);
}

main();
