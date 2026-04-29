#!/usr/bin/env node
"use strict";

// .skill/scripts/src/health-check.ts
var import_node_fs3 = require("node:fs");
var import_node_path3 = require("node:path");

// .skill/scripts/src/lib/vault.ts
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");
var ENV_VAR = "GROW_WIKI_ROOT";
var SETUP_GUIDE = `error: ${ENV_VAR} \u74B0\u5883\u5909\u6570\u304C\u672A\u8A2D\u5B9A\u3067\u3059\u3002

grow-wiki \u306F\u66F8\u304D\u8FBC\u307F\u5148 vault \u3092\u74B0\u5883\u5909\u6570\u3067\u53D7\u3051\u53D6\u308A\u307E\u3059\u3002\u4EE5\u4E0B\u306E\u3044\u305A\u308C\u304B\u3067\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044:

  \u65B9\u6CD51. Claude Code (~/.claude/settings.json) \u306E env \u30BB\u30AF\u30B7\u30E7\u30F3:
    { "env": { "${ENV_VAR}": "/absolute/path/to/Obsidian Vault/grow-wiki" } }

  \u65B9\u6CD52. Gemini CLI (~/.gemini/settings.json) \u306E env \u30BB\u30AF\u30B7\u30E7\u30F3:
    { "env": { "${ENV_VAR}": "/absolute/path/to/Obsidian Vault/grow-wiki" } }

  \u65B9\u6CD53. \u30B7\u30A7\u30EB\u3067 export (macOS / Linux):
    export ${ENV_VAR}="/absolute/path/to/Obsidian Vault/grow-wiki"

  \u65B9\u6CD54. PowerShell (Windows) \u3067\u6C38\u7D9A\u5316:
    [Environment]::SetEnvironmentVariable("${ENV_VAR}", "C:\\path\\to\\Obsidian Vault\\grow-wiki", "User")
    \uFF08\u8A2D\u5B9A\u5F8C\u306F PowerShell \u3092\u958B\u304D\u76F4\u3057\u3066\u304F\u3060\u3055\u3044\uFF09

  \u65B9\u6CD55. cmd (Windows) \u3067\u6C38\u7D9A\u5316:
    setx ${ENV_VAR} "C:\\path\\to\\Obsidian Vault\\grow-wiki"
`;
function resolveVaultRoot() {
  const value = process.env[ENV_VAR];
  if (!value || value.trim() === "") {
    process.stderr.write(SETUP_GUIDE);
    process.exit(2);
  }
  return (0, import_node_path.resolve)(value.trim());
}
function ensureVaultExists(root) {
  if (!(0, import_node_fs.existsSync)(root)) {
    process.stderr.write(`error: vault \u30C7\u30A3\u30EC\u30AF\u30C8\u30EA\u304C\u5B58\u5728\u3057\u307E\u305B\u3093: ${root}
`);
    process.stderr.write(`\u5148\u306B init-vault \u3092\u5B9F\u884C\u3057\u3066\u304F\u3060\u3055\u3044: node .skill/scripts/init-vault.js
`);
    process.exit(2);
  }
}
function relPath(from, to) {
  if (from === to) return ".";
  return (0, import_node_path.relative)(from, to).split(import_node_path.sep).join("/");
}

// .skill/scripts/src/lib/wikilink.ts
var WIKILINK_RE = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g;
function extractWikilinks(text) {
  const results = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    const target = m[1].trim();
    const aliasRaw = m[2];
    const link = { target, raw: m[0] };
    if (aliasRaw !== void 0) {
      link.alias = aliasRaw.trim();
    }
    results.push(link);
  }
  return results;
}

// .skill/scripts/src/lib/walk.ts
var import_node_fs2 = require("node:fs");
var import_node_path2 = require("node:path");
function isHidden(name) {
  return name.startsWith(".");
}
function listMarkdownFiles(d) {
  const result = [];
  for (const entry of (0, import_node_fs2.readdirSync)(d, { withFileTypes: true })) {
    if (isHidden(entry.name)) continue;
    if (entry.isFile() && entry.name.endsWith(".md")) {
      result.push((0, import_node_path2.join)(d, entry.name));
    }
  }
  return result;
}
function listSubdirectories(d) {
  const result = [];
  for (const entry of (0, import_node_fs2.readdirSync)(d, { withFileTypes: true })) {
    if (isHidden(entry.name)) continue;
    if (entry.isDirectory()) {
      result.push((0, import_node_path2.join)(d, entry.name));
    }
  }
  return result;
}
function walkAllMarkdownFiles(root) {
  const all = [];
  const stack = [root];
  while (stack.length > 0) {
    const dir = stack.pop();
    all.push(...listMarkdownFiles(dir));
    for (const sub of listSubdirectories(dir)) {
      stack.push(sub);
    }
  }
  return all;
}

// .skill/scripts/src/health-check.ts
var EXCLUDED_STEMS = /* @__PURE__ */ new Set(["index", "overview", "log", "README"]);
function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`\n]*`/g, "");
}
function stemOf(path) {
  return (0, import_node_path3.basename)(path).replace(/\.md$/, "");
}
function main() {
  const vault = resolveVaultRoot();
  ensureVaultExists(vault);
  const allFiles = walkAllMarkdownFiles(vault).sort();
  const contentFiles = /* @__PURE__ */ new Map();
  for (const p of allFiles) {
    const stem = stemOf(p);
    if (!EXCLUDED_STEMS.has(stem)) {
      contentFiles.set(stem, p);
    }
  }
  const broken = [];
  const refs = /* @__PURE__ */ new Map();
  for (const stem of contentFiles.keys()) {
    refs.set(stem, 0);
  }
  for (const path of allFiles) {
    let text;
    try {
      text = (0, import_node_fs3.readFileSync)(path, "utf8");
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
      if (target === stemOf(path)) continue;
      refs.set(target, (refs.get(target) ?? 0) + 1);
    }
  }
  process.stdout.write("=== grow-wiki health check ===\n");
  process.stdout.write(`vault: ${vault}
`);
  process.stdout.write(`content pages: ${contentFiles.size}
`);
  process.stdout.write(`total .md files: ${allFiles.length}
`);
  if (broken.length > 0) {
    process.stdout.write(`
\u274C broken wikilinks: ${broken.length}
`);
    for (const { src, target } of broken) {
      process.stdout.write(`  ${src} -> [[${target}]]
`);
    }
  } else {
    process.stdout.write("\n\u2705 broken wikilinks: 0\n");
  }
  const orphans = [];
  for (const [stem, n] of refs.entries()) {
    if (n === 0) orphans.push(stem);
  }
  if (orphans.length > 0) {
    orphans.sort();
    process.stdout.write(`
\u26A0\uFE0F  orphan pages: ${orphans.length} (warn)
`);
    for (const o of orphans) {
      const p = contentFiles.get(o);
      if (p) {
        process.stdout.write(`  ${relPath(vault, p)}
`);
      }
    }
  } else {
    process.stdout.write("\n\u2705 orphan pages: 0\n");
  }
  process.exit(broken.length > 0 ? 1 : 0);
}
main();
