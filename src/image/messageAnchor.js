const CHAT_SELECTORS = ['#chat .mes', '.chat .mes'];
const MESSAGE_TEXT_SELECTOR = '.mes_text';

function queryMessages(doc = document) {
  for (const selector of CHAT_SELECTORS) {
    const messages = Array.from(doc.querySelectorAll(selector));
    if (messages.length) {
      return messages;
    }
  }
  return [];
}

function messageIndex(message, fallback) {
  const raw = message?.dataset?.messageIndex
    ?? message?.dataset?.mesid
    ?? message?.getAttribute?.('mesid')
    ?? message?.getAttribute?.('data-message-index');
  const number = Number(raw);
  return Number.isInteger(number) ? number : fallback;
}

function messageId(message) {
  return message?.dataset?.messageId
    ?? message?.dataset?.mesid
    ?? message?.getAttribute?.('data-message-id')
    ?? message?.getAttribute?.('mesid')
    ?? '';
}

function isAssistantMessage(message) {
  const className = String(message?.className || '');
  const isUser = className.split(/\s+/).includes('user_mes')
    || message?.dataset?.role === 'user'
    || message?.getAttribute?.('is_user') === 'true';
  return !isUser;
}

function getMessageTextElement(message) {
  return message?.querySelector?.(MESSAGE_TEXT_SELECTOR) ?? message;
}

function collectTextNodes(root, nodes = []) {
  if (!root) return nodes;
  if (root.nodeType === 3) {
    if (root.nodeValue) nodes.push(root);
    return nodes;
  }
  if (root.classList?.contains?.('stlp-chat-image-preview') || root.classList?.contains?.('stlp-generated-image')) {
    return nodes;
  }
  for (const child of Array.from(root.childNodes ?? [])) {
    collectTextNodes(child, nodes);
  }
  return nodes;
}

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function countOccurrences(value, search) {
  if (!search) return 0;
  let count = 0;
  let index = String(value || '').indexOf(search);
  while (index >= 0) {
    count += 1;
    index = String(value || '').indexOf(search, index + search.length);
  }
  return count;
}

export function findTextNodeByQuote(root, quote) {
  const wanted = normalizeText(quote).toLowerCase();
  const result = { node: null, matchCount: 0, exact: false, normalized: false };
  if (!wanted) return result;

  const textNodes = collectTextNodes(root);
  const exactMatches = textNodes
    .map((node) => ({ node, count: countOccurrences(node.nodeValue, quote) }))
    .filter((match) => match.count > 0);
  const exactCount = exactMatches.reduce((count, match) => count + match.count, 0);
  if (exactCount > 0) {
    return {
      node: exactCount === 1 ? exactMatches[0].node : null,
      matchCount: exactCount,
      exact: exactCount === 1,
      normalized: false,
    };
  }

  const normalizedMatches = textNodes
    .map((node) => ({ node, count: countOccurrences(normalizeText(node.nodeValue).toLowerCase(), wanted) }))
    .filter((match) => match.count > 0);
  const normalizedCount = normalizedMatches.reduce((count, match) => count + match.count, 0);
  return {
    node: normalizedCount === 1 ? normalizedMatches[0].node : null,
    matchCount: normalizedCount,
    exact: false,
    normalized: normalizedCount === 1,
  };
}

export function findTargetMessage(plan = {}, { document: doc = globalThis.document } = {}) {
  if (!doc) return { messages: [], message: null, textElement: null };
  const messages = queryMessages(doc);
  let message = null;
  let missingTargetField = null;

  if (plan.target === 'message_index') {
    if (plan.messageIndex === undefined) {
      missingTargetField = 'messageIndex';
    } else {
      message = messages.find((item, index) => messageIndex(item, index) === Number(plan.messageIndex));
    }
  } else if (plan.target === 'message_id') {
    if (!plan.messageId) {
      missingTargetField = 'messageId';
    } else {
      message = messages.find((item) => String(messageId(item)) === String(plan.messageId));
    }
  } else if (plan.target === 'latest_message') {
    message = messages.at(-1) ?? null;
  } else {
    message = [...messages].reverse().find(isAssistantMessage) ?? messages.at(-1) ?? null;
  }

  return { messages, message, textElement: getMessageTextElement(message), missingTargetField };
}

export function resolveMessageAnchor(plan = {}, options = {}) {
  const target = findTargetMessage(plan, options);
  const textElement = target.textElement;
  const anchorMatch = plan.anchorQuote ? findTextNodeByQuote(textElement, plan.anchorQuote) : null;
  const hasUniqueExactAnchor = Boolean(anchorMatch?.node && anchorMatch.matchCount === 1 && anchorMatch.exact);
  const anchorNode = hasUniqueExactAnchor ? anchorMatch.node : null;
  const anchorFound = hasUniqueExactAnchor;
  let fallbackUsed = null;
  let reason = null;

  if (target.missingTargetField) {
    fallbackUsed = 'preview_only';
    reason = 'missingTargetField';
  } else if (!target.message) {
    fallbackUsed = 'preview_only';
    reason = 'targetMessageNotFound';
  } else if ((plan.placement === 'after_anchor' || plan.placement === 'before_anchor') && !anchorFound) {
    fallbackUsed = plan.fallback || 'after_message';
    reason = anchorMatch?.matchCount > 1 ? 'ambiguousAnchor' : 'anchorNotFound';
  }

  return {
    ...target,
    anchorNode,
    anchorFound,
    anchorMatch: anchorMatch ?? { node: null, matchCount: 0, exact: false, normalized: false },
    targetMessageFound: Boolean(target.message),
    fallbackUsed,
    reason,
  };
}

export default { findTargetMessage, resolveMessageAnchor };
