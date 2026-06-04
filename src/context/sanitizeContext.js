const IMAGE_BLOCK_PATTERN = /<image\b[^>]*>[\s\S]*?<\/image>|<img\b[^>]*>/gi;
const HTML_TAG_PATTERN = /<[^>]+>/g;
const LONG_WHITESPACE_PATTERN = /[ \t]{3,}|\n{3,}/g;

function sanitizeText(value, removedBlocks) {
  if (value === undefined || value === null) {
    return '';
  }

  let text = String(value);
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

  return text.trim();
}

function sanitizeArray(values, removedBlocks) {
  return Array.isArray(values) ? values.map((value) => sanitizeText(value, removedBlocks)).filter(Boolean) : [];
}

export function sanitizeContext(context = {}) {
  const removedBlocks = [];
  const recentMessages = Array.isArray(context?.chat?.recentMessages)
    ? context.chat.recentMessages.map((message) => ({
      ...message,
      content: sanitizeText(message?.content, removedBlocks),
    }))
    : [];

  return {
    ...context,
    chat: {
      ...context.chat,
      latestMessage: sanitizeText(context?.chat?.latestMessage, removedBlocks),
      recentMessages,
    },
    character: {
      ...context.character,
      name: sanitizeText(context?.character?.name, removedBlocks),
      aliases: sanitizeArray(context?.character?.aliases, removedBlocks),
      description: sanitizeText(context?.character?.description, removedBlocks),
      personality: sanitizeText(context?.character?.personality, removedBlocks),
      scenario: sanitizeText(context?.character?.scenario, removedBlocks),
      stableAppearance: sanitizeArray(context?.character?.stableAppearance, removedBlocks),
      currentState: sanitizeArray(context?.character?.currentState, removedBlocks),
    },
    sanitizer: {
      ...(context.sanitizer ?? {}),
      removedBlocks,
    },
  };
}

export default sanitizeContext;
