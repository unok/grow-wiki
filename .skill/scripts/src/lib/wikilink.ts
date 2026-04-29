// wikilink.ts — [[...]] 形式の wikilink を抽出
const WIKILINK_RE = /\[\[([^\[\]|]+?)(?:\|([^\[\]]+?))?\]\]/g;

export interface Wikilink {
  target: string;
  alias?: string;
  raw: string;
}

export function extractWikilinks(text: string): Wikilink[] {
  const results: Wikilink[] = [];
  for (const m of text.matchAll(WIKILINK_RE)) {
    const target = m[1].trim();
    const aliasRaw = m[2];
    const link: Wikilink = { target, raw: m[0] };
    if (aliasRaw !== undefined) {
      link.alias = aliasRaw.trim();
    }
    results.push(link);
  }
  return results;
}

export function displayText(link: Wikilink): string {
  return link.alias ?? link.target;
}
