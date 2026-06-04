const BLOCK_ORDER = Object.freeze([
  'quality',
  'subject',
  'identity',
  'character',
  'face',
  'hair',
  'eyes',
  'body',
  'clothing',
  'clothingState',
  'pose',
  'interaction',
  'expression',
  'environment',
  'props',
  'camera',
  'lighting',
  'style',
  'backendSpecific',
  'lora',
]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asStringArray(value) {
  if (value === null || value === undefined) {
    return [];
  }
  const source = Array.isArray(value) ? value : [value];
  return source
    .flatMap((item) => (Array.isArray(item) ? asStringArray(item) : [item]))
    .map((item) => {
      if (typeof item === 'string') {
        return item.trim();
      }
      if (item && typeof item === 'object') {
        return JSON.stringify(item);
      }
      return String(item ?? '').trim();
    })
    .filter(Boolean);
}

function normalizePositiveBlocks(value) {
  const source = isPlainObject(value) ? value : {};
  const keys = [...BLOCK_ORDER, ...Object.keys(source).filter((key) => !BLOCK_ORDER.includes(key))];
  const blocks = {};

  for (const key of keys) {
    blocks[key] = asStringArray(source[key]);
  }

  return blocks;
}

function blockTagCount(positiveBlocks = {}) {
  return Object.values(positiveBlocks).reduce((count, tags) => count + (Array.isArray(tags) ? tags.length : 0), 0);
}

export function normalizeCompiledPrompt(input) {
  if (!isPlainObject(input)) {
    return null;
  }

  const positiveBlocks = normalizePositiveBlocks(input.positiveBlocks);
  const positive = asStringArray(input.positive);
  const negative = asStringArray(input.negative);
  const warnings = asStringArray(input.warnings);

  return {
    shouldGenerate: input.shouldGenerate !== false,
    positiveBlocks,
    positive,
    negative,
    params: isPlainObject(input.params) ? input.params : {},
    warnings,
    dropped: asStringArray(input.dropped),
    debug: isPlainObject(input.debug) ? input.debug : {},
  };
}

export function isCompiledPromptUsable(input) {
  const normalized = normalizeCompiledPrompt(input);
  if (!normalized) {
    return false;
  }

  if (normalized.shouldGenerate === false) {
    return true;
  }

  return blockTagCount(normalized.positiveBlocks) > 0
    || normalized.positive.length > 0
    || normalized.negative.length > 0;
}

export default { normalizeCompiledPrompt, isCompiledPromptUsable };
