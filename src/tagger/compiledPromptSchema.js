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

const INSERTION_TARGETS = Object.freeze(['latest_assistant', 'latest_message', 'message_index', 'message_id']);
const INSERTION_PLACEMENTS = Object.freeze(['after_anchor', 'before_anchor', 'after_message', 'before_message']);
const INSERTION_FALLBACKS = Object.freeze(['after_message', 'message_end', 'preview_only']);
const DISPLAY_MODES = Object.freeze(['block', 'inline', 'float']);
const DISPLAY_ALIGNS = Object.freeze(['left', 'center', 'right']);
const DISPLAY_SIZES = Object.freeze(['small', 'medium', 'large', 'custom']);

function enumValue(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

function asOptionalString(value) {
  const text = value === undefined || value === null ? '' : String(value).trim();
  return text || undefined;
}

function asOptionalInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : undefined;
}

export function normalizeInsertionPlan(input, { context } = {}) {
  const source = isPlainObject(input) ? input : {};
  const displaySource = isPlainObject(source.display) ? source.display : {};
  const contextMessageIndex = asOptionalInteger(context?.metadata?.messageIndex ?? context?.metadata?.message_index);
  const contextMessageId = asOptionalString(context?.metadata?.messageId ?? context?.metadata?.message_id);
  const target = enumValue(source.target, INSERTION_TARGETS, 'latest_assistant');
  const normalized = {
    target,
    anchorQuote: asOptionalString(source.anchorQuote ?? source.anchor_quote),
    placement: enumValue(source.placement, INSERTION_PLACEMENTS, 'after_anchor'),
    fallback: enumValue(source.fallback, INSERTION_FALLBACKS, 'after_message'),
    display: {
      mode: enumValue(displaySource.mode, DISPLAY_MODES, 'block'),
      align: enumValue(displaySource.align, DISPLAY_ALIGNS, 'center'),
      size: enumValue(displaySource.size, DISPLAY_SIZES, 'medium'),
    },
    reason: asOptionalString(source.reason),
  };

  if (target === 'message_index') {
    normalized.messageIndex = asOptionalInteger(source.messageIndex ?? source.message_index) ?? contextMessageIndex;
  } else if (target === 'message_id') {
    normalized.messageId = asOptionalString(source.messageId ?? source.message_id) ?? contextMessageId;
  }

  return normalized;
}

function blockTagCount(positiveBlocks = {}) {
  return Object.values(positiveBlocks).reduce((count, tags) => count + (Array.isArray(tags) ? tags.length : 0), 0);
}

export function normalizeCompiledPrompt(input, { context } = {}) {
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
    insertionPlan: normalizeInsertionPlan(input.insertionPlan, { context }),
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
