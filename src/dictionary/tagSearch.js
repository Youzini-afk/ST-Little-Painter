import { FALLBACK_TAGS } from './tagDictionary.js';
import { cleanTag } from './tagNormalize.js';

export function searchTags(query = '', { dictionary = FALLBACK_TAGS, limit = 12, category } = {}) {
  const needle = cleanTag(query).toLowerCase();
  if (!needle) {
    return [];
  }

  return dictionary
    .filter((entry) => (!category || entry.category === category)
      && [entry.tag, ...(entry.aliases ?? [])].some((value) => value.toLowerCase().includes(needle)))
    .slice(0, limit);
}

export function dictionaryHintsForText(text = '', { dictionary = FALLBACK_TAGS, limit = 24 } = {}) {
  const source = String(text ?? '').toLowerCase();
  const hits = [];
  for (const entry of dictionary) {
    const values = [entry.tag, ...(entry.aliases ?? [])];
    if (values.some((value) => source.includes(value.toLowerCase()))) {
      hits.push({ tag: entry.tag, category: entry.category });
    }
    if (hits.length >= limit) {
      break;
    }
  }
  return hits;
}

export default searchTags;
