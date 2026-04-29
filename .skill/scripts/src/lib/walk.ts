// walk.ts — vault 内のディレクトリ・markdown を再帰的に走査
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

// dot で始まるディレクトリ・ファイルは除外（.skill, .git, .obsidian など）
function isHidden(name: string): boolean {
  return name.startsWith('.');
}

export function listMarkdownFiles(d: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    if (isHidden(entry.name)) continue;
    if (entry.isFile() && entry.name.endsWith('.md')) {
      result.push(join(d, entry.name));
    }
  }
  return result;
}

export function listSubdirectories(d: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(d, { withFileTypes: true })) {
    if (isHidden(entry.name)) continue;
    if (entry.isDirectory()) {
      result.push(join(d, entry.name));
    }
  }
  return result;
}

export function walkAllDirectories(root: string): string[] {
  const all: string[] = [root];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    for (const sub of listSubdirectories(dir)) {
      all.push(sub);
      stack.push(sub);
    }
  }
  return all;
}

export function walkAllMarkdownFiles(root: string): string[] {
  const all: string[] = [];
  const stack: string[] = [root];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    all.push(...listMarkdownFiles(dir));
    for (const sub of listSubdirectories(dir)) {
      stack.push(sub);
    }
  }
  return all;
}
