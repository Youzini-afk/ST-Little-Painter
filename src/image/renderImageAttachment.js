function getImageDataUrl(record = {}) {
  return record.image?.dataUrl || record.dataUrl || '';
}

function hasValidImageData(record = {}) {
  return /^data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/]+=*$/i.test(getImageDataUrl(record));
}

function findExistingGenerationNode(record = {}, doc = document) {
  const id = String(record.id ?? '');
  if (!id || !doc?.querySelectorAll) {
    return null;
  }

  return Array.from(doc.querySelectorAll('[data-stlp-generation-id]'))
    .find((node) => node.dataset?.stlpGenerationId === id) ?? null;
}

function applyDisplayClasses(wrapper, display = {}) {
  wrapper.classList.add(`stlp-image-mode-${display.mode || 'block'}`);
  wrapper.classList.add(`stlp-image-align-${display.align || 'center'}`);
  wrapper.classList.add(`stlp-image-size-${display.size || 'medium'}`);
}

export function createRenderOnlyImageAttachment(record = {}, { insertionPlan } = {}) {
  const mode = insertionPlan?.display?.mode || 'block';
  const wrapper = document.createElement(mode === 'inline' ? 'span' : 'div');
  wrapper.className = 'stlp-chat-image-preview';
  wrapper.dataset.stlpGenerationId = record.id ?? '';
  wrapper.id = `stlp-render-${String(record.id ?? Date.now()).replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  applyDisplayClasses(wrapper, insertionPlan?.display ?? {});

  const image = document.createElement('img');
  image.className = 'stlp-generated-image';
  image.src = getImageDataUrl(record);
  image.alt = `ST-Little Painter generation ${record.id ?? ''}`.trim();
  image.loading = 'lazy';

  wrapper.append(image);
  return wrapper;
}

function insertRelativeToAnchorNode(textNode, node, placement) {
  const parent = textNode?.parentNode;
  if (!parent) return false;

  parent.insertBefore(node, placement === 'before_anchor' ? textNode : textNode.nextSibling);
  return true;
}

function insertAtMessageText(textElement, node, placement) {
  if (!textElement) return false;
  if (placement === 'before_anchor' || placement === 'before_message') {
    textElement.insertBefore(node, textElement.firstChild);
    return true;
  }
  textElement.append(node);
  return true;
}

export function renderImageAttachment(record = {}, anchor = {}, { insertionPlan } = {}) {
  if (typeof document === 'undefined') {
    return { inserted: false, reason: 'document unavailable', node: null };
  }

  if (!hasValidImageData(record)) {
    return { inserted: false, reason: 'image data unavailable', node: null };
  }

  const existing = findExistingGenerationNode(record, document);
  if (existing) {
    return { inserted: false, reason: 'already inserted', node: existing };
  }

  const node = createRenderOnlyImageAttachment(record, { insertionPlan });
  if (insertionPlan?.anchorQuote) {
    node.dataset.stlpAnchorQuote = insertionPlan.anchorQuote;
  }

  if (!anchor?.targetMessageFound || insertionPlan?.fallback === 'preview_only') {
    return { inserted: false, reason: anchor?.reason || 'preview only', node };
  }

  const placement = insertionPlan?.placement || 'after_anchor';
  const fallbackUsed = anchor?.fallbackUsed;
  if ((placement === 'before_anchor' || placement === 'after_anchor') && anchor?.anchorNode && !fallbackUsed) {
    insertRelativeToAnchorNode(anchor.anchorNode, node, placement);
    return { inserted: true, node };
  }

  if (fallbackUsed === 'preview_only') {
    return { inserted: false, reason: anchor?.reason || 'preview only', node };
  }

  const message = anchor?.message;
  const textElement = anchor?.textElement;
  if (!message && !textElement) {
    return { inserted: false, reason: 'target unavailable', node };
  }

  const effectivePlacement = fallbackUsed || placement;
  if (effectivePlacement === 'before_message') {
    message?.parentNode?.insertBefore(node, message);
  } else if (effectivePlacement === 'after_message') {
    message?.parentNode?.insertBefore(node, message.nextSibling);
  } else {
    insertAtMessageText(textElement || message, node, effectivePlacement);
  }

  return { inserted: true, node };
}

export default { createRenderOnlyImageAttachment, renderImageAttachment };
