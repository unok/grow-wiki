// lint.ts — grow-wiki vault の整合性チェック (L1〜L7)
//
// 使い方:
//   node .skill/scripts/lint.js              # 全チェック
//   node .skill/scripts/lint.js --check      # read-only（副作用なし。lint.ts 自体が副作用なしなので同義）
//   node .skill/scripts/lint.js --quiet      # error のみ出力
//
// 終了コード: 0=ok, 1=warn, 2=error
//
// 閾値は references/lint-rules.md と同期すること。
import { readFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { resolveVaultRoot, ensureVaultExists } from './lib/vault.js';
import {
  parseFrontmatter,
  getStringField,
  getStringListField,
  type Frontmatter,
} from './lib/frontmatter.js';
import { extractWikilinks } from './lib/wikilink.js';
import {
  listMarkdownFiles,
  listSubdirectories,
  walkAllDirectories,
  walkAllMarkdownFiles,
} from './lib/walk.js';

// === 閾値（references/lint-rules.md と同期） ===
const L1_WARN = 20;
const L1_ERROR = 40;
const L2_WARN_LINES = 300;
const L2_WARN_CHARS = 8000;
const L2_ERROR_LINES = 500;
const L2_ERROR_CHARS = 15000;
// =============================================

const EXCLUDED_STEMS = new Set(['index', 'overview', 'log', 'README']);
const CITATION_HEADINGS = new Set(['出典', 'Sources', 'References', '参考', 'Citations']);
const MISC_DIR_NAMES = new Set(['misc', 'etc', 'others']);
const URL_PATTERN = /https?:\/\/\S+/;
const WIKILINK_PATTERN = /\[\[[^\]]+\]\]/;

interface Issue {
  rule: string;
  message: string;
}

interface PageMeta {
  path: string;
  rel: string;
  stem: string;
  text: string;
  fm: Frontmatter;
  lines: number;
  chars: number;
}

function parseCli(): { quiet: boolean } {
  let quiet = false;
  for (const arg of process.argv.slice(2)) {
    if (arg === '--check') continue;
    if (arg === '--quiet') {
      quiet = true;
      continue;
    }
    process.stderr.write(`unknown option: ${arg}\n`);
    process.exit(2);
  }
  return { quiet };
}

function relPath(vault: string, p: string): string {
  if (p === vault) return '.';
  return relative(vault, p).split(sep).join('/');
}

function stemOf(path: string): string {
  return basename(path).replace(/\.md$/, '');
}

function stripCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function stripComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function countLines(text: string): number {
  const newlines = (text.match(/\n/g) ?? []).length;
  return newlines + (text.endsWith('\n') ? 0 : 1);
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number.parseInt(m[1]!, 10);
  const month = Number.parseInt(m[2]!, 10);
  const day = Number.parseInt(m[3]!, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return null;
  }
  return d;
}

function listContentPages(d: string): string[] {
  return listMarkdownFiles(d).filter((p) => !EXCLUDED_STEMS.has(stemOf(p)));
}

function main(): void {
  const { quiet } = parseCli();
  const vault = resolveVaultRoot();
  ensureVaultExists(vault);

  const warnings: Issue[] = [];
  const errors: Issue[] = [];
  const addWarn = (rule: string, message: string): void => {
    warnings.push({ rule, message });
  };
  const addError = (rule: string, message: string): void => {
    errors.push({ rule, message });
  };

  const allDirs = walkAllDirectories(vault).sort();
  const allMd = walkAllMarkdownFiles(vault).sort();

  const pageMeta = new Map<string, PageMeta>();
  for (const md of allMd) {
    const text = readFileSync(md, 'utf8');
    const { frontmatter } = parseFrontmatter(text);
    pageMeta.set(md, {
      path: md,
      rel: relPath(vault, md),
      stem: stemOf(md),
      text,
      fm: frontmatter,
      lines: countLines(text),
      chars: text.length,
    });
  }

  // ===== L1: folder-size =====
  for (const d of allDirs) {
    const pages = listContentPages(d);
    const subdirs = listSubdirectories(d);
    const n = pages.length + subdirs.length;
    const rel = relPath(vault, d);
    const detail = `${pages.length} files + ${subdirs.length} subfolders`;
    if (n > L1_ERROR) {
      addError('L1', `${rel}/: ${n} items (${detail}, error, threshold ${L1_ERROR})`);
    } else if (n > L1_WARN) {
      addWarn('L1', `${rel}/: ${n} items (${detail}, warn, threshold ${L1_WARN})`);
    }
  }

  // ===== L2: file-length =====
  for (const meta of pageMeta.values()) {
    if (meta.lines > L2_ERROR_LINES || meta.chars > L2_ERROR_CHARS) {
      addError(
        'L2',
        `${meta.rel}: ${meta.lines} lines / ${meta.chars} chars ` +
          `(error, threshold ${L2_ERROR_LINES} lines / ${L2_ERROR_CHARS} chars)`,
      );
    } else if (meta.lines > L2_WARN_LINES || meta.chars > L2_WARN_CHARS) {
      addWarn(
        'L2',
        `${meta.rel}: ${meta.lines} lines / ${meta.chars} chars ` +
          `(warn, threshold ${L2_WARN_LINES} lines / ${L2_WARN_CHARS} chars)`,
      );
    }
  }

  // ===== L3: index-completeness =====
  const allStems = new Set<string>();
  for (const meta of pageMeta.values()) {
    if (!EXCLUDED_STEMS.has(meta.stem)) {
      allStems.add(meta.stem);
    }
  }

  for (const d of allDirs) {
    const idxPath = join(d, 'index.md');
    const idxMeta = pageMeta.get(idxPath);
    if (!idxMeta) continue;

    const actual = new Set(listContentPages(d).map(stemOf));
    const linked = new Set<string>();
    for (const link of extractWikilinks(stripCode(idxMeta.text))) {
      linked.add(link.target);
    }
    const missing = [...actual].filter((s) => !linked.has(s)).sort();
    const extra = [...linked]
      .filter((s) => !actual.has(s) && !EXCLUDED_STEMS.has(s) && !allStems.has(s))
      .sort();
    if (missing.length > 0) {
      addError(
        'L3',
        `${idxMeta.rel}: missing links -> ` + missing.map((m) => `[[${m}]]`).join(', '),
      );
    }
    if (extra.length > 0) {
      addError(
        'L3',
        `${idxMeta.rel}: extra links -> ` + extra.map((e) => `[[${e}]]`).join(', '),
      );
    }
  }

  // ===== L7: misc-flat =====
  for (const d of allDirs) {
    if (d === vault) continue;
    if (!MISC_DIR_NAMES.has(basename(d).toLowerCase())) continue;
    const subdirs = listSubdirectories(d);
    if (subdirs.length === 0) continue;
    const rel = relPath(vault, d);
    const names = subdirs
      .slice(0, 5)
      .map((s) => basename(s))
      .join(', ');
    const more = subdirs.length > 5 ? '...' : '';
    addError(
      'L7',
      `${rel}/: ${basename(d)}/etc/others 下にサブフォルダを作らない ` +
        `(${subdirs.length} subfolders: ${names}${more}) → 親フォルダに新しいフォルダを作って分類`,
    );
  }

  // ===== L5: subfolder-exclusivity =====
  for (const d of allDirs) {
    const subdirs = listSubdirectories(d);
    if (subdirs.length === 0) continue;
    const directPages = listContentPages(d);
    if (directPages.length === 0) continue;
    const rel = relPath(vault, d);
    const stems = directPages.slice(0, 5).map(stemOf);
    const more = directPages.length > 5 ? '...' : '';
    addError(
      'L5',
      `${rel}/: サブフォルダが存在するのに直下に ${directPages.length} ページある ` +
        `(${stems.join(', ')}${more}) → サブフォルダに移動するか misc/ へ`,
    );
  }

  // ===== L4: index-freshness & link-text validity =====
  const titleMap = new Map<string, { title: string; aliases: string[] }>();
  for (const meta of pageMeta.values()) {
    if (EXCLUDED_STEMS.has(meta.stem)) continue;
    const title = getStringField(meta.fm, 'title') ?? meta.stem;
    const aliases = getStringListField(meta.fm, 'aliases');
    titleMap.set(meta.stem, { title, aliases });
  }

  for (const d of allDirs) {
    const idxPath = join(d, 'index.md');
    const idxMeta = pageMeta.get(idxPath);
    if (!idxMeta) continue;

    const idxLast = getStringField(idxMeta.fm, 'last_updated') ?? '';
    const idxDate = parseDate(idxLast);

    if (idxDate) {
      const newer: string[] = [];
      for (const p of listMarkdownFiles(d)) {
        const s = stemOf(p);
        if (EXCLUDED_STEMS.has(s)) continue;
        const pMeta = pageMeta.get(p);
        if (!pMeta) continue;
        const pLast = getStringField(pMeta.fm, 'last_updated') ?? '';
        const pDate = parseDate(pLast);
        if (pDate && pDate.getTime() > idxDate.getTime()) {
          newer.push(s);
        }
      }
      if (newer.length > 0) {
        newer.sort();
        const more = newer.length > 5 ? '...' : '';
        addWarn(
          'L4',
          `${idxMeta.rel}: last_updated=${idxLast}, ${newer.length} newer pages ` +
            `(${newer.slice(0, 5).join(', ')}${more})`,
        );
      }
    }

    for (const link of extractWikilinks(stripCode(idxMeta.text))) {
      const t = link.target;
      if (EXCLUDED_STEMS.has(t)) continue;
      const tm = titleMap.get(t);
      if (!tm) continue; // L3 が検出
      if (t !== tm.title && !tm.aliases.includes(t)) {
        addError(
          'L4',
          `${idxMeta.rel}: [[${t}]] does not match title="${tm.title}" or any alias`,
        );
      }
    }
  }

  // ===== L6: citation-required =====
  for (const meta of pageMeta.values()) {
    if (EXCLUDED_STEMS.has(meta.stem)) continue;
    const pageType = getStringField(meta.fm, 'type') ?? '';

    if (pageType === 'source-url') {
      const src = getStringField(meta.fm, 'source_url') ?? '';
      if (src.trim() === '') {
        addWarn('L6', `${meta.rel}: source-url だが frontmatter の source_url が空`);
      }
      continue;
    }

    if (pageType !== 'entity' && pageType !== 'concept') continue;

    const clean = stripComments(stripCode(meta.text));
    const lines = clean.split(/\r?\n/);
    let foundSection = false;
    let inSection = false;
    let citationLevel = 0;
    let buf: string[] = [];
    for (const line of lines) {
      const m = line.match(/^(#+)\s+(.+?)\s*$/);
      if (m) {
        const level = m[1]!.length;
        const heading = m[2]!.trim();
        if (CITATION_HEADINGS.has(heading)) {
          inSection = true;
          foundSection = true;
          citationLevel = level;
          buf = [];
          continue;
        } else if (inSection && level <= citationLevel) {
          break;
        }
      }
      if (inSection) buf.push(line);
    }

    if (!foundSection) {
      addWarn(
        'L6',
        `${meta.rel}: '## 出典' (または Sources/References/参考) セクションがない`,
      );
      continue;
    }

    const sectionText = buf.join('\n');
    if (!WIKILINK_PATTERN.test(sectionText) && !URL_PATTERN.test(sectionText)) {
      addWarn(
        'L6',
        `${meta.rel}: 出典セクションにリンク/URL がない（[[...]] か http(s):// を 1 つ以上記載）`,
      );
    }
  }

  // ===== output =====
  if (!quiet) {
    process.stdout.write('=== grow-wiki lint ===\n');
    process.stdout.write(`vault: ${vault}\n`);
    process.stdout.write(`pages scanned: ${allMd.length}\n`);
    process.stdout.write('\n');
  }

  if (warnings.length > 0 && !quiet) {
    process.stdout.write(`⚠️  warnings: ${warnings.length}\n`);
    for (const w of warnings) {
      process.stdout.write(`  [${w.rule}] ${w.message}\n`);
    }
    process.stdout.write('\n');
  }

  if (errors.length > 0) {
    process.stdout.write(`❌ errors: ${errors.length}\n`);
    for (const e of errors) {
      process.stdout.write(`  [${e.rule}] ${e.message}\n`);
    }
    process.stdout.write('\n');
  }

  if (warnings.length === 0 && errors.length === 0 && !quiet) {
    process.stdout.write('✅ no issues\n');
  }

  if (errors.length > 0) process.exit(2);
  if (warnings.length > 0) process.exit(1);
  process.exit(0);
}

main();
