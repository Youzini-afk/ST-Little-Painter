export const FALLBACK_CONFLICTS = Object.freeze([
  { tags: ['full body', 'upper body', 'portrait'], keep: 'first', reason: 'composition crop conflict' },
  { tags: ['close-up', 'wide shot'], keep: 'first', reason: 'camera distance conflict' },
  { tags: ['low angle', 'high angle'], keep: 'first', reason: 'camera angle conflict' },
  { tags: ['small breasts', 'large breasts'], keep: 'first', reason: 'body attribute conflict' },
  { tags: ['standing', 'sitting', 'kneeling', 'lying down'], keep: 'first', reason: 'primary pose conflict' },
  { tags: ['soft lighting', 'dramatic lighting'], keep: 'first', reason: 'lighting mood conflict' },
  { tags: ['anime style', 'photorealistic'], keep: 'first', reason: 'style conflict' },
]);

const CONFLICT_URL = new URL('../../assets/compiled/tags/conflicts.json', import.meta.url);
let cachedConflicts = null;

export async function loadConflicts() {
  if (cachedConflicts) {
    return cachedConflicts;
  }
  if (typeof fetch === 'function') {
    try {
      const response = await fetch(CONFLICT_URL);
      if (response.ok) {
        cachedConflicts = await response.json();
        return cachedConflicts;
      }
    } catch {
      // Use static fallback.
    }
  }
  cachedConflicts = [...FALLBACK_CONFLICTS];
  return cachedConflicts;
}

export function resolveConflicts(tags = [], conflicts = FALLBACK_CONFLICTS) {
  const result = [...tags];
  const trace = [];

  for (const conflict of conflicts) {
    if (conflict.keep === 'all') {
      continue;
    }
    const lowerSet = new Set(conflict.tags.map((tag) => tag.toLowerCase()));
    const matches = result
      .map((tag, index) => ({ tag, index }))
      .filter(({ tag }) => lowerSet.has(tag.toLowerCase()));

    if (matches.length <= 1) {
      continue;
    }

    const keepIndex = matches[0].index;
    for (const match of matches.slice(1).reverse()) {
      result.splice(match.index, 1);
      trace.push({ removed: match.tag, kept: result[keepIndex], reason: conflict.reason ?? 'conflict' });
    }
  }

  return { tags: result, trace };
}

export default resolveConflicts;
