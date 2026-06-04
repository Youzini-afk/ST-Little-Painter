const NEGATIVE_PACK_URL = new URL('../../assets/compiled/tags/negative_packs.json', import.meta.url);
const REFERENCE_NEGATIVE_PACK_URL = new URL('../../assets/compiled/tags/reference_negative_packs.json', import.meta.url);

export const FALLBACK_NEGATIVE_PACKS = Object.freeze({
  default: ['low quality', 'blurry', 'bad anatomy', 'extra fingers', 'missing fingers', 'watermark', 'text'],
  hands: ['bad hands', 'extra fingers', 'missing fingers', 'fused fingers'],
  photo: ['jpeg artifacts', 'overexposed', 'underexposed', 'out of focus'],
  anime: ['off model', 'bad proportions', 'deformed face'],
});

let cachedNegativePacks = null;

function mergeNegativePacks(...packsList) {
  const merged = {};
  for (const packs of packsList) {
    if (!packs || typeof packs !== 'object') continue;
    for (const [name, values] of Object.entries(packs)) {
      const existing = merged[name] ?? [];
      const nextValues = Array.isArray(values) ? values : [];
      merged[name] = [...new Set([...existing, ...nextValues.map((value) => String(value || '').trim()).filter(Boolean)])];
    }
  }
  return merged;
}

async function fetchJson(url) {
  if (typeof fetch !== 'function') return null;
  try {
    const response = await fetch(url);
    return response.ok ? response.json() : null;
  } catch {
    return null;
  }
}

export async function loadNegativePacks() {
  if (cachedNegativePacks) return cachedNegativePacks;
  const [base, reference] = await Promise.all([
    fetchJson(NEGATIVE_PACK_URL),
    fetchJson(REFERENCE_NEGATIVE_PACK_URL),
  ]);
  cachedNegativePacks = mergeNegativePacks(FALLBACK_NEGATIVE_PACKS, base, reference);
  return cachedNegativePacks;
}

export default { loadNegativePacks };
