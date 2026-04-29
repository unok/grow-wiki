// build.mjs — .skill/scripts/src/*.ts を esbuild で bundle して .skill/scripts/*.js に出力
//
// js-yaml を含む全依存を 1 ファイルに同梱する。配布物の利用者は npm install 不要。
//
// 使い方:
//   pnpm build         # 全エントリをビルド
//   node scripts/build.mjs --watch   # 監視モード
import { build, context } from 'esbuild';
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SRC_DIR = resolve(REPO_ROOT, '.skill/scripts/src');
const OUT_DIR = resolve(REPO_ROOT, '.skill/scripts');

async function findEntries() {
  if (!existsSync(SRC_DIR)) {
    console.error(`source dir not found: ${SRC_DIR}`);
    process.exit(1);
  }
  const files = await readdir(SRC_DIR);
  // lib/ 配下と _ 始まりは entry にしない
  return files
    .filter((f) => f.endsWith('.ts') && !f.startsWith('_'))
    .map((f) => resolve(SRC_DIR, f));
}

const buildOptions = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outdir: OUT_DIR,
  outExtension: { '.js': '.js' },
  banner: { js: '#!/usr/bin/env node' },
  logLevel: 'info',
};

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const entryPoints = await findEntries();
  if (entryPoints.length === 0) {
    console.log('no entries to build (yet)');
    return;
  }
  if (process.argv.includes('--watch')) {
    const ctx = await context({ ...buildOptions, entryPoints });
    await ctx.watch();
    console.log('watching...');
  } else {
    await build({ ...buildOptions, entryPoints });
    console.log(`built ${entryPoints.length} entries -> ${OUT_DIR}`);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
