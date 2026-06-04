const ASSET_URL = new URL('../../assets/compiled/tags/tag_dictionary.jsonl', import.meta.url);
const REFERENCE_ASSET_URL = new URL('../../assets/compiled/tags/reference_tag_dictionary.jsonl', import.meta.url);

export const FALLBACK_TAGS = Object.freeze([
  { tag: 'masterpiece', category: 'quality', aliases: ['best quality'] },
  { tag: 'high quality', category: 'quality', aliases: ['hires', 'highres'] },
  { tag: 'detailed', category: 'quality', aliases: ['intricate details'] },
  { tag: 'full body', category: 'composition', aliases: ['whole body'] },
  { tag: 'upper body', category: 'composition', aliases: ['bust shot'] },
  { tag: 'portrait', category: 'composition', aliases: ['headshot'] },
  { tag: 'close-up', category: 'camera', aliases: ['closeup'] },
  { tag: 'wide shot', category: 'camera', aliases: ['long shot'] },
  { tag: 'low angle', category: 'camera', aliases: [] },
  { tag: 'high angle', category: 'camera', aliases: [] },
  { tag: 'depth of field', category: 'camera', aliases: ['dof', 'bokeh'] },
  { tag: 'soft lighting', category: 'lighting', aliases: ['soft light'] },
  { tag: 'dramatic lighting', category: 'lighting', aliases: ['dramatic light'] },
  { tag: 'rim lighting', category: 'lighting', aliases: ['rim light'] },
  { tag: 'backlighting', category: 'lighting', aliases: ['backlit'] },
  { tag: 'golden hour', category: 'lighting', aliases: ['sunset light'] },
  { tag: 'slim body', category: 'body', aliases: ['slender body'] },
  { tag: 'curvy body', category: 'body', aliases: ['curvy figure'] },
  { tag: 'large breasts', category: 'body', aliases: ['big breasts'] },
  { tag: 'small breasts', category: 'body', aliases: ['flat chest'] },
  { tag: 'open clothes', category: 'clothingState', aliases: ['open shirt'] },
  { tag: 'wet clothes', category: 'clothingState', aliases: ['soaked clothes'] },
  { tag: 'partially undressed', category: 'clothingState', aliases: ['half-dressed'] },
  { tag: 'standing', category: 'pose', aliases: ['standing pose'] },
  { tag: 'sitting', category: 'pose', aliases: ['seated'] },
  { tag: 'kneeling', category: 'pose', aliases: ['on knees'] },
  { tag: 'lying down', category: 'pose', aliases: ['reclining'] },
  { tag: 'looking at viewer', category: 'pose', aliases: ['eye contact'] },
  { tag: 'hugging', category: 'interaction', aliases: ['embrace'] },
  { tag: 'holding hands', category: 'interaction', aliases: ['hand holding'] },
  { tag: 'kissing', category: 'interaction', aliases: ['kiss'] },
  { tag: 'straddling', category: 'interaction', aliases: ['straddle'] },
  { tag: 'pinning down', category: 'interaction', aliases: ['pinned down'] },
  { tag: 'bedroom', category: 'environment', aliases: [] },
  { tag: 'school classroom', category: 'environment', aliases: ['classroom'] },
  { tag: 'anime style', category: 'style', aliases: ['anime'] },
  { tag: 'photorealistic', category: 'style', aliases: ['realistic photo'] },
  { tag: 'low quality', category: 'negative', aliases: ['worst quality'] },
  { tag: 'blurry', category: 'negative', aliases: ['blur'] },
  { tag: 'bad anatomy', category: 'negative', aliases: ['anatomy error'] },
  { tag: 'extra fingers', category: 'negative', aliases: ['too many fingers'] },
  { tag: 'missing fingers', category: 'negative', aliases: ['fewer fingers'] },
  { tag: 'watermark', category: 'negative', aliases: ['signature'] },
  { tag: 'text', category: 'negative', aliases: ['caption'] },
]);

let cachedDictionary = null;

function parseJsonl(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function mergeDictionaries(...dictionaries) {
  const byTag = new Map();
  for (const dictionary of dictionaries) {
    for (const entry of dictionary ?? []) {
      if (!entry?.tag) continue;
      const tag = String(entry.tag).trim();
      const key = tag.toLowerCase();
      const existing = byTag.get(key);
      if (!existing) {
        byTag.set(key, {
          ...entry,
          tag,
          aliases: [...new Set((entry.aliases ?? []).filter(Boolean))],
          zhAliases: [...new Set((entry.zhAliases ?? []).filter(Boolean))],
          keywords: [...new Set((entry.keywords ?? []).filter(Boolean))],
        });
      } else {
        existing.aliases = [...new Set([...(existing.aliases ?? []), ...(entry.aliases ?? [])].filter(Boolean))];
        existing.zhAliases = [...new Set([...(existing.zhAliases ?? []), ...(entry.zhAliases ?? [])].filter(Boolean))];
        existing.keywords = [...new Set([...(existing.keywords ?? []), ...(entry.keywords ?? [])].filter(Boolean))];
        existing.weight = Math.max(Number(existing.weight ?? 1), Number(entry.weight ?? 1));
        existing.sources = [...new Set([...(existing.sources ?? []), ...(entry.sources ?? []), entry.source].filter(Boolean))];
      }
    }
  }
  return [...byTag.values()];
}

async function fetchJsonl(url) {
  if (typeof fetch !== 'function') return [];
  try {
    const response = await fetch(url);
    return response.ok ? parseJsonl(await response.text()) : [];
  } catch {
    return [];
  }
}

export async function loadTagDictionary() {
  if (cachedDictionary) {
    return cachedDictionary;
  }

  if (typeof fetch === 'function') {
    const [base, reference] = await Promise.all([
      fetchJsonl(ASSET_URL),
      fetchJsonl(REFERENCE_ASSET_URL),
    ]);
    if (base.length || reference.length) {
      cachedDictionary = mergeDictionaries(FALLBACK_TAGS, base, reference);
      return cachedDictionary;
    }
  }

  cachedDictionary = mergeDictionaries(FALLBACK_TAGS);
  return cachedDictionary;
}

export function getFallbackDictionary() {
  return [...FALLBACK_TAGS];
}

export function getDictionaryHints({ categories = [], limit = 24 } = {}) {
  const wanted = new Set(categories.filter(Boolean));
  const tags = FALLBACK_TAGS
    .filter((entry) => !wanted.size || wanted.has(entry.category))
    .slice(0, limit)
    .map((entry) => `${entry.category}:${entry.tag}`);

  return tags;
}

export default { loadTagDictionary, getFallbackDictionary, getDictionaryHints };
