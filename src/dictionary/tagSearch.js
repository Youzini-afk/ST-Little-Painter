import { FALLBACK_TAGS } from './tagDictionary.js';
import { cleanTag } from './tagNormalize.js';

export function searchTags(query = '', { dictionary = FALLBACK_TAGS, limit = 12, category } = {}) {
  const needle = cleanTag(query).toLowerCase();
  if (!needle) {
    return [];
  }

  return dictionary
    .filter((entry) => (!category || entry.category === category)
      && [entry.tag, ...(entry.aliases ?? []), ...(entry.zhAliases ?? []), ...(entry.keywords ?? [])]
        .some((value) => String(value).toLowerCase() === needle || String(value).toLowerCase().includes(needle)))
    .slice(0, limit);
}

function isCjk(value = '') {
  return /[\u3400-\u9fff]/.test(value);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchValue(source, value, type) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const normalized = raw.toLowerCase();
  if (isCjk(normalized)) {
    if (normalized.length < 2 && type !== 'zhAlias') return null;
    return source.includes(normalized) ? { matched: raw, score: type === 'zhAlias' ? 100 : 80 } : null;
  }
  if (normalized.length < 3) return null;
  const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalized)}([^a-z0-9]|$)`, 'i');
  return pattern.test(source) ? { matched: raw, score: type === 'tag' ? 60 : 50 } : null;
}

export function dictionaryHintsForText(text = '', { dictionary = FALLBACK_TAGS, limit = 24 } = {}) {
  const source = String(text ?? '').toLowerCase();
  const hits = [];
  for (const entry of dictionary) {
    if (entry.category === 'unknown') continue;
    const candidates = [
      ...((entry.zhAliases ?? []).map((value) => ({ type: 'zhAlias', value }))),
      ...((entry.keywords ?? []).map((value) => ({ type: 'keyword', value }))),
      { type: 'tag', value: entry.tag },
      ...((entry.aliases ?? []).map((value) => ({ type: 'alias', value }))),
    ];
    const matches = candidates.map((candidate) => ({ ...candidate, result: matchValue(source, candidate.value, candidate.type) }))
      .filter((candidate) => candidate.result);
    if (matches.length) {
      const best = matches.sort((a, b) => b.result.score - a.result.score)[0];
      hits.push({ tag: entry.tag, category: entry.category, matched: best.result.matched, score: best.result.score + Number(entry.weight ?? 1) });
    }
  }
  return hits
    .sort((a, b) => b.score - a.score || String(a.tag).localeCompare(String(b.tag)))
    .slice(0, limit);
}

export default searchTags;
