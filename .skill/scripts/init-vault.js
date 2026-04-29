#!/usr/bin/env node
"use strict";

// .skill/scripts/src/init-vault.ts
var import_node_fs = require("node:fs");
var import_node_path2 = require("node:path");

// .skill/scripts/src/lib/vault.ts
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

// .skill/scripts/src/init-vault.ts
var TEMPLATES_DIR = (0, import_node_path2.resolve)(__dirname, "../assets/templates");
function today() {
  const d = /* @__PURE__ */ new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function render(template, title, dateStr) {
  const p = (0, import_node_path2.join)(TEMPLATES_DIR, template);
  if (!(0, import_node_fs.existsSync)(p)) {
    process.stderr.write(`error: template not found: ${p}
`);
    process.exit(2);
  }
  let text = (0, import_node_fs.readFileSync)(p, "utf8");
  text = text.replaceAll("{{date}}", dateStr);
  text = text.replaceAll("{{folder_title}}", title);
  return text;
}
function ensureFile(dest, template, title, dateStr) {
  if ((0, import_node_fs.existsSync)(dest)) {
    process.stdout.write(`skip  ${dest}
`);
    return;
  }
  (0, import_node_fs.mkdirSync)((0, import_node_path2.dirname)(dest), { recursive: true });
  (0, import_node_fs.writeFileSync)(dest, render(template, title, dateStr), "utf8");
  process.stdout.write(`create ${dest}
`);
}
function main() {
  const vault = resolveVaultRoot();
  const dateStr = today();
  (0, import_node_fs.mkdirSync)((0, import_node_path2.join)(vault, "sources/conversations"), { recursive: true });
  (0, import_node_fs.mkdirSync)((0, import_node_path2.join)(vault, "sources/urls"), { recursive: true });
  (0, import_node_fs.mkdirSync)((0, import_node_path2.join)(vault, "entities"), { recursive: true });
  (0, import_node_fs.mkdirSync)((0, import_node_path2.join)(vault, "concepts"), { recursive: true });
  ensureFile((0, import_node_path2.join)(vault, "index.md"), "root-index.md", "", dateStr);
  ensureFile((0, import_node_path2.join)(vault, "overview.md"), "overview.md", "", dateStr);
  ensureFile((0, import_node_path2.join)(vault, "log.md"), "log.md", "", dateStr);
  ensureFile((0, import_node_path2.join)(vault, "sources/index.md"), "folder-index.md", "sources", dateStr);
  ensureFile(
    (0, import_node_path2.join)(vault, "sources/conversations/index.md"),
    "folder-index.md",
    "sources/conversations",
    dateStr
  );
  ensureFile((0, import_node_path2.join)(vault, "sources/urls/index.md"), "folder-index.md", "sources/urls", dateStr);
  ensureFile((0, import_node_path2.join)(vault, "entities/index.md"), "folder-index.md", "entities", dateStr);
  ensureFile((0, import_node_path2.join)(vault, "concepts/index.md"), "folder-index.md", "concepts", dateStr);
  process.stdout.write(`done: ${vault}
`);
}
main();
