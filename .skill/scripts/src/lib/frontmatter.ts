// frontmatter.ts — YAML frontmatter のパース
//
// CORE_SCHEMA を使う理由: DEFAULT_SCHEMA は `last_updated: 2026-04-29` のような
// ISO 日付を JS Date オブジェクトに自動変換してしまう。grow-wiki では日付を文字列
// として比較する（lint.ts L4 freshness 等）ので、文字列のまま保つ必要がある。
import { load, CORE_SCHEMA } from 'js-yaml';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export type Frontmatter = Record<string, unknown>;

export interface ParsedFile {
  frontmatter: Frontmatter;
  body: string;
  raw: string;
}

export function parseFrontmatter(content: string): ParsedFile {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content, raw: content };
  }
  let parsed: unknown = {};
  try {
    parsed = load(match[1]!, { schema: CORE_SCHEMA }) ?? {};
  } catch {
    parsed = {};
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    parsed = {};
  }
  return {
    frontmatter: parsed as Frontmatter,
    body: content.slice(match[0].length),
    raw: content,
  };
}

export function getStringField(fm: Frontmatter, key: string): string | undefined {
  const v = fm[key];
  return typeof v === 'string' ? v : undefined;
}

export function getStringListField(fm: Frontmatter, key: string): string[] {
  const v = fm[key];
  if (Array.isArray(v)) {
    return v.filter((x): x is string => typeof x === 'string');
  }
  return [];
}
