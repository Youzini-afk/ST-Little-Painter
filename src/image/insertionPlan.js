const TARGETS = Object.freeze(['latest_assistant', 'latest_message', 'message_index', 'message_id']);
const PLACEMENTS = Object.freeze(['after_anchor', 'before_anchor', 'after_message', 'before_message']);
const FALLBACKS = Object.freeze(['after_message', 'message_end', 'preview_only']);
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

export function resolveInsertionPlan({ insertionPlan, finalPrompt, context } = {}) {
  const source = insertionPlan ?? finalPrompt?.insertionPlan ?? {};
  const displaySource = source?.display && typeof source.display === 'object' ? source.display : {};
  const contextMessageIndex = asOptionalInteger(context?.metadata?.messageIndex ?? context?.metadata?.message_index);
  const contextMessageId = asOptionalString(context?.metadata?.messageId ?? context?.metadata?.message_id);
  const target = enumValue(source?.target, TARGETS, 'latest_assistant');
  const resolved = {
    target,
    anchorQuote: asOptionalString(source?.anchorQuote ?? source?.anchor_quote),
    placement: enumValue(source?.placement, PLACEMENTS, 'after_anchor'),
    fallback: enumValue(source?.fallback, FALLBACKS, 'after_message'),
    display: {
      mode: enumValue(displaySource.mode, DISPLAY_MODES, 'block'),
      align: enumValue(displaySource.align, DISPLAY_ALIGNS, 'center'),
      size: enumValue(displaySource.size, DISPLAY_SIZES, 'medium'),
    },
    reason: asOptionalString(source?.reason),
  };

  if (target === 'message_index') {
    resolved.messageIndex = asOptionalInteger(source?.messageIndex ?? source?.message_index) ?? contextMessageIndex;
  } else if (target === 'message_id') {
    resolved.messageId = asOptionalString(source?.messageId ?? source?.message_id) ?? contextMessageId;
  }

  return resolved;
}

export default { resolveInsertionPlan };
