import { normalizeTags as normalizeTagList } from '../dictionary/tagNormalize.js';

export function normalizeTags(tags = [], { aliases } = {}) {
  const { tags: normalized, trace } = normalizeTagList(tags, aliases);
  const seen = new Set();
  const deduped = [];
  const dedupeTrace = [];

  for (const tag of normalized) {
    const key = tag.toLowerCase();
    if (seen.has(key)) {
      dedupeTrace.push({ removed: tag, reason: 'duplicate' });
      continue;
    }
    seen.add(key);
    deduped.push(tag);
  }

  return { tags: deduped, trace: [...trace, ...dedupeTrace] };
}

export default normalizeTags;
