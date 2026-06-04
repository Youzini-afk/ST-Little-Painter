import { cleanMvuBlocks } from './mvuCleaner.js';
import { input_cleanup } from '../regex/regexStages.js';
import { applyTaskRegex } from '../regex/taskRegex.js';

const IMAGE_BLOCK_PATTERN = /<image\b[^>]*>[\s\S]*?<\/image>|<img\b[^>]*>/gi;
const STLP_RENDER_ONLY_PATTERN = /<[^>]*class=["'][^"']*(?:stlp-chat-image-preview|stlp-generated-image)[^"']*["'][^>]*>[\s\S]*?<\/[^>]+>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const LONG_WHITESPACE_PATTERN = /[ \t]{3,}|\n{3,}/g;

function sanitizeText(value, removedBlocks, regexTransforms, regexRules) {
  if (value === undefined || value === null) {
    return '';
  }

  const mvuResult = cleanMvuBlocks(value);
  let text = mvuResult.text;
  removedBlocks.push(...mvuResult.removedBlocks);

  text = text.replace(STLP_RENDER_ONLY_PATTERN, (match) => {
    removedBlocks.push({ type: 'stlpRenderOnlyImage', preview: match.slice(0, 120), length: match.length });
    return ' ';
  });

  text = text.replace(IMAGE_BLOCK_PATTERN, (match) => {
    removedBlocks.push({ type: 'image', preview: match.slice(0, 120), length: match.length });
    return ' ';
  });

  text = text.replace(HTML_TAG_PATTERN, (match) => {
    removedBlocks.push({ type: 'htmlTag', preview: match.slice(0, 120), length: match.length });
    return ' ';
  });

  text = text.replace(LONG_WHITESPACE_PATTERN, (match) => {
    removedBlocks.push({ type: 'whitespace', preview: match.slice(0, 40), length: match.length });
    return match.includes('\n') ? '\n\n' : ' ';
  });

  const regexResult = applyTaskRegex(text, regexRules, { stage: input_cleanup });
  regexTransforms.push(...regexResult.transforms);

  return regexResult.text.trim();
}

function sanitizeArray(values, removedBlocks, regexTransforms, regexRules) {
  return Array.isArray(values)
    ? values.map((value) => sanitizeText(value, removedBlocks, regexTransforms, regexRules)).filter(Boolean)
    : [];
}

export function sanitizeContext(context = {}, { settings } = {}) {
  const removedBlocks = [];
  const regexTransforms = [];
  const regexRules = Array.isArray(settings?.regex?.rules) ? settings.regex.rules : [];
  const recentMessages = Array.isArray(context?.chat?.recentMessages)
    ? context.chat.recentMessages.map((message) => ({
      ...message,
      content: sanitizeText(message?.content, removedBlocks, regexTransforms, regexRules),
    }))
    : [];

  return {
    ...context,
    chat: {
      ...context.chat,
      latestMessage: sanitizeText(context?.chat?.latestMessage, removedBlocks, regexTransforms, regexRules),
      recentMessages,
    },
    character: {
      ...context.character,
      name: sanitizeText(context?.character?.name, removedBlocks, regexTransforms, regexRules),
      aliases: sanitizeArray(context?.character?.aliases, removedBlocks, regexTransforms, regexRules),
      description: sanitizeText(context?.character?.description, removedBlocks, regexTransforms, regexRules),
      personality: sanitizeText(context?.character?.personality, removedBlocks, regexTransforms, regexRules),
      scenario: sanitizeText(context?.character?.scenario, removedBlocks, regexTransforms, regexRules),
      stableAppearance: sanitizeArray(context?.character?.stableAppearance, removedBlocks, regexTransforms, regexRules),
      currentState: sanitizeArray(context?.character?.currentState, removedBlocks, regexTransforms, regexRules),
    },
    sanitizer: {
      ...(context.sanitizer ?? {}),
      removedBlocks,
      regexTransforms,
    },
  };
}

export default sanitizeContext;
