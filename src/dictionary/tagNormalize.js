import { FALLBACK_TAGS } from './tagDictionary.js';

export const FALLBACK_ALIASES = Object.freeze(Object.fromEntries(
  FALLBACK_TAGS.flatMap((entry) => (entry.aliases ?? []).map((alias) => [alias, entry.tag])),
));

const ALIAS_URL = new URL('../../assets/compiled/tags/aliases.json', import.meta.url);
let cachedAliases = null;

export function cleanTag(tag) {
  return String(tag ?? '')
    .replace(/[\n\r]+/g, ' ')
    .replace(/^,+|,+$/g, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeTag(tag, aliases = FALLBACK_ALIASES) {
  const cleaned = cleanTag(tag);
  const key = cleaned.toLowerCase();
  return aliases[key] ?? aliases[cleaned] ?? cleaned;
}

export async function loadAliases() {
  if (cachedAliases) {
    return cachedAliases;
  }
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(ALIAS_URL);
      if (response.ok) {
        cachedAliases = { ...FALLBACK_ALIASES, ...(await response.json()) };
        return cachedAliases;
      }
    } catch {
      // Use static fallback.
    }
  }
  cachedAliases = { ...FALLBACK_ALIASES };
  return cachedAliases;
}

export function normalizeTags(tags = [], aliases = FALLBACK_ALIASES) {
  const trace = [];
  const normalized = tags.map((tag) => {
    const next = normalizeTag(tag, aliases);
    if (cleanTag(tag) !== next) {
      trace.push({ from: cleanTag(tag), to: next, reason: 'alias' });
    }
    return next;
  }).filter(Boolean);

  return { tags: normalized, trace };
}

export default normalizeTags;
