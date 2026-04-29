#!/usr/bin/env node
// install.mjs — Claude Code 用の grow-wiki スキル登録
//
// 使い方:
//   node install.mjs                # 既定の ~/.claude/skills/grow-wiki に symlink
//   node install.mjs <skills-dir>   # 指定ディレクトリ配下に grow-wiki を作る
//
// ~/.claude/skills/grow-wiki -> <repo>/.skill のシンボリックリンクを作成する。
// Windows では directory junction を作成（管理者権限不要）。
import { existsSync, symlinkSync, mkdirSync, lstatSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SKILL_SRC = resolve(REPO_ROOT, '.skill');

function main() {
  if (!existsSync(SKILL_SRC)) {
    console.error(`error: skill source not found: ${SKILL_SRC}`);
    process.exit(1);
  }

  const arg = process.argv[2];
  const skillsDir = arg ? resolve(arg) : join(homedir(), '.claude', 'skills');
  const linkPath = join(skillsDir, 'grow-wiki');

  mkdirSync(skillsDir, { recursive: true });

  if (existsSync(linkPath)) {
    const stat = lstatSync(linkPath);
    if (stat.isSymbolicLink()) {
      console.log(`既存の symlink を削除して再作成: ${linkPath}`);
      unlinkSync(linkPath);
    } else {
      console.error(`error: ${linkPath} は既に存在し、symlink ではありません。`);
      console.error('手動で削除してから再実行してください。');
      process.exit(1);
    }
  }

  symlinkSync(SKILL_SRC, linkPath, 'dir');

  console.log(`linked: ${linkPath} -> ${SKILL_SRC}`);
  console.log('');
  console.log('次の手順:');
  console.log('1. 環境変数 GROW_WIKI_ROOT を設定（vault パス）');
  console.log('2. Claude Code を起動');
  console.log('3. 「grow-wiki に保存」「メモっておいて」等で起動');
}

main();
