#!/usr/bin/env node
// install.mjs — Gemini CLI 用 grow-wiki カスタムコマンドをインストール
//
// 使い方:
//   node install.mjs                    # 既定の ~/.gemini/commands/ に配置
//   node install.mjs <out-dir>          # 指定ディレクトリに配置
//
// templates/*.toml のテンプレート内のプレースホルダを展開して出力する:
//   {{REPO_PATH}}             → このリポジトリの絶対パス
//   {{INCLUDE: relative.md}}  → リポジトリ内の指定ファイルの内容を埋め込む
//
// Windows / macOS / Linux いずれでも node があれば動く。
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const TEMPLATES_DIR = resolve(__dirname, 'templates');

async function expand(template, repoPath) {
  // {{INCLUDE: path}} を先に展開
  const includeRe = /\{\{INCLUDE:\s*([^}]+?)\s*\}\}/g;
  const includes = [...template.matchAll(includeRe)];
  for (const m of includes) {
    const relPath = m[1].trim();
    const fullPath = resolve(repoPath, relPath);
    const content = await readFile(fullPath, 'utf8');
    template = template.replace(m[0], content);
  }
  // {{REPO_PATH}}
  template = template.replaceAll('{{REPO_PATH}}', repoPath);
  return template;
}

async function main() {
  const arg = process.argv[2];
  const outDir = arg ? resolve(arg) : join(homedir(), '.gemini', 'commands');

  await mkdir(outDir, { recursive: true });

  const files = await readdir(TEMPLATES_DIR);
  const templates = files.filter((f) => f.endsWith('.toml'));
  if (templates.length === 0) {
    console.error(`error: no .toml templates found in ${TEMPLATES_DIR}`);
    process.exit(1);
  }

  for (const tpl of templates) {
    const text = await readFile(join(TEMPLATES_DIR, tpl), 'utf8');
    const expanded = await expand(text, REPO_ROOT);
    const dest = join(outDir, tpl);
    await writeFile(dest, expanded, 'utf8');
    console.log(`installed: ${dest}`);
  }

  console.log('');
  console.log(`done. ${templates.length} commands installed to ${outDir}`);
  console.log('');
  console.log('次の手順:');
  console.log('1. 環境変数 GROW_WIKI_ROOT を設定（vault パス）');
  console.log('2. gemini を起動して /wiki-init で vault 初期化');
  console.log('3. /wiki-save / /wiki-url / /wiki-ask などで操作');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
